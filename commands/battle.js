const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getActiveEvents } = require('../utils/config');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('開始一場進階回合制戰鬥'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const data = db.read();
        const player = data.players[userId];

        if (!player) {
            return interaction.reply({ content: '你還沒有註冊遊戲！請先使用 `/start` 指令。', ephemeral: true });
        }

        // 檢查冷卻時間
        const now = Date.now();
        if (player.lastBattle && now - player.lastBattle < 30000) { // 30秒冷卻
            const remaining = Math.ceil((30000 - (now - player.lastBattle)) / 1000);
            return interaction.reply({ content: `戰鬥冷卻中！請等待 ${remaining} 秒。`, ephemeral: true });
        }

        // 生成敵人
        const enemies = [
            { name: '哥布林', hp: 80, maxHp: 80, attack: 15, defense: 5, level: 1, skills: ['attack'] },
            { name: '獸人戰士', hp: 120, maxHp: 120, attack: 25, defense: 10, level: 2, skills: ['attack', 'rage'] },
            { name: '黑暗精靈', hp: 100, maxHp: 100, attack: 20, defense: 8, level: 3, skills: ['attack', 'poison'] },
            { name: '龍人', hp: 150, maxHp: 150, attack: 30, defense: 15, level: 4, skills: ['attack', 'fire_breath'] },
            { name: '惡魔領主', hp: 200, maxHp: 200, attack: 35, defense: 20, level: 5, skills: ['attack', 'curse', 'summon'] }
        ];

        const enemy = enemies[Math.floor(Math.random() * enemies.length)];

        // 初始化戰鬥狀態
        const battleState = {
            player: {
                hp: 100 + (player.stats?.vitality || 0) * 5,
                maxHp: 100 + (player.stats?.vitality || 0) * 5,
                attack: 10 + (player.stats?.strength || 0) * 2,
                defense: 5 + (player.stats?.defense || 0) * 2,
                level: player.level || 1,
                effects: [],
                pet: player.pet ? {
                    name: player.pet.name,
                    hp: player.pet.hp || 50,
                    maxHp: player.pet.hp || 50,
                    attack: player.pet.attack || 10,
                    skills: player.pet.skills || []
                } : null
            },
            enemy: {
                ...enemy,
                effects: []
            },
            turn: 'player',
            round: 1,
            log: []
        };

        // 計算裝備加成
        if (player.equipment) {
            if (player.equipment.weapon) {
                battleState.player.attack += player.equipment.weapon.attack || 0;
            }
            if (player.equipment.armor) {
                battleState.player.defense += player.equipment.armor.defense || 0;
            }
        }

        player.lastBattle = now;
        db.write(data);

        await startTurnBasedBattle(interaction, battleState, userId);
    }
};

// 回合制戰鬥系統
async function startTurnBasedBattle(interaction, battleState, userId) {
    const createBattleEmbed = (state) => {
        const embed = new EmbedBuilder()
            .setTitle(`⚔️ 回合制戰鬥 - 第 ${state.round} 回合`)
            .setColor(state.turn === 'player' ? 0x00FF00 : 0xFF6B6B);

        let description = `**${state.turn === 'player' ? '你的回合' : '敵人回合'}**\n\n`;

        // 玩家狀態
        description += `**玩家**\n`;
        description += `❤️ HP: ${state.player.hp}/${state.player.maxHp}\n`;
        description += `⚔️ 攻擊: ${state.player.attack} | 🛡️ 防禦: ${state.player.defense}\n`;

        if (state.player.effects.length > 0) {
            description += `📋 狀態: ${state.player.effects.map(e => e.name).join(', ')}\n`;
        }

        if (state.player.pet) {
            description += `🐾 寵物 ${state.player.pet.name}: ${state.player.pet.hp}/${state.player.pet.maxHp} HP\n`;
        }

        description += `\n**敵人: ${state.enemy.name} (Lv.${state.enemy.level})**\n`;
        description += `❤️ HP: ${state.enemy.hp}/${state.enemy.maxHp}\n`;
        description += `⚔️ 攻擊: ${state.enemy.attack} | 🛡️ 防禦: ${state.enemy.defense}\n`;

        if (state.enemy.effects.length > 0) {
            description += `📋 狀態: ${state.enemy.effects.map(e => e.name).join(', ')}\n`;
        }

        // 顯示最近的戰鬥日誌
        if (state.log.length > 0) {
            description += `\n**戰鬥日誌:**\n${state.log.slice(-3).join('\n')}`;
        }

        embed.setDescription(description);
        return embed;
    };

    const createActionButtons = (state) => {
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('attack')
                    .setLabel('攻擊')
                    .setEmoji('⚔️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('skill')
                    .setLabel('技能')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('defend')
                    .setLabel('防禦')
                    .setEmoji('🛡️')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_action')
                    .setLabel('寵物行動')
                    .setEmoji('🐾')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!state.player.pet || state.player.pet.hp <= 0),
                new ButtonBuilder()
                    .setCustomId('flee')
                    .setLabel('逃跑')
                    .setEmoji('💨')
                    .setStyle(ButtonStyle.Secondary)
            );

        return state.turn === 'player' ? [row1, row2] : [];
    };

    const response = await interaction.reply({
        embeds: [createBattleEmbed(battleState)],
        components: createActionButtons(battleState)
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5分鐘超時
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== userId) return i.reply({ content: '這不是你的戰鬥！', ephemeral: true });

        if (battleState.turn !== 'player') return;

        let actionTaken = false;

        if (i.customId === 'attack') {
            await handlePlayerAttack(battleState);
            actionTaken = true;
        } else if (i.customId === 'skill') {
            await handleSkillSelection(i, battleState);
            return;
        } else if (i.customId === 'defend') {
            battleState.log.push('🛡️ 你選擇防禦，下回合傷害減少50%！');
            battleState.player.defending = true;
            actionTaken = true;
        } else if (i.customId === 'pet_action') {
            await handlePetAction(battleState);
            actionTaken = true;
        } else if (i.customId === 'flee') {
            const fleeSuccess = Math.random() < 0.6;
            if (fleeSuccess) {
                battleState.log.push('💨 成功逃脫戰鬥！');
                collector.stop('flee');
                return;
            } else {
                battleState.log.push('💨 逃跑失敗！敵人抓住機會攻擊！');
                await handleEnemyAttack(battleState);
                actionTaken = true;
            }
        }

        if (actionTaken) {
            processEffects(battleState);

            if (battleState.player.hp <= 0) {
                collector.stop('lose');
                return;
            }
            if (battleState.enemy.hp <= 0) {
                collector.stop('win');
                return;
            }

            battleState.turn = 'enemy';
            battleState.round++;

            await i.update({
                embeds: [createBattleEmbed(battleState)],
                components: createActionButtons(battleState)
            });

            setTimeout(async () => {
                await handleEnemyTurn(battleState, i);
            }, 2000);
        }
    });

    collector.on('end', async (collected, reason) => {
        const data = db.read();
        const player = data.players[userId];

        if (reason === 'win') {
            const basePoints = battleState.enemy.level * 50;
            const events = getActiveEvents();
            let pointsMultiplier = 1;
            events.forEach(event => {
                if (event.points_multiplier) pointsMultiplier = event.points_multiplier;
            });

            const points = Math.floor(basePoints * pointsMultiplier);
            const crystals = Math.floor(battleState.enemy.level * 5 * pointsMultiplier);

            player.weekly_points = (player.weekly_points || 0) + points;
            player.crystals = (player.crystals || 0) + crystals;

            if (!data.dailyTasks) data.dailyTasks = {};
            if (data.dailyTasks[userId]) {
                data.dailyTasks[userId].tasks.forEach(task => {
                    if (task.action === 'battle_win') task.progress++;
                });
            }

            const expGain = battleState.enemy.level * 10;
            player.exp = (player.exp || 0) + expGain;

            const expNeeded = player.level * 100;
            if (player.exp >= expNeeded) {
                player.level = (player.level || 1) + 1;
                player.exp -= expNeeded;
                battleState.log.push(`🎉 恭喜升級到 Lv.${player.level}！`);
            }

            db.write(data);

            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 戰鬥勝利！')
                .setDescription(`你擊敗了 **${battleState.enemy.name}**！`)
                .addFields(
                    { name: '💝 獎勵', value: `+${points} 積分\n+${crystals} 結晶`, inline: true },
                    { name: '⭐ 經驗', value: `+${expGain} EXP`, inline: true },
                    { name: '📊 戰鬥統計', value: `回合數: ${battleState.round}\n最終HP: ${battleState.player.hp}/${battleState.player.maxHp}`, inline: true }
                )
                .setColor(0x00FF00);

            await response.edit({ embeds: [winEmbed], components: [] });

        } else if (reason === 'lose') {
            const loseEmbed = new EmbedBuilder()
                .setTitle('💀 戰鬥失敗')
                .setDescription(`你被 **${battleState.enemy.name}** 擊敗了...`)
                .addFields(
                    { name: '💔 損失', value: '失去 10 結晶', inline: true }
                )
                .setColor(0xFF0000);

            player.crystals = Math.max(0, (player.crystals || 0) - 10);
            db.write(data);

            await response.edit({ embeds: [loseEmbed], components: [] });

        } else if (reason === 'flee') {
            const fleeEmbed = new EmbedBuilder()
                .setTitle('💨 成功逃脫')
                .setDescription('你逃離了戰鬥，沒有獲得獎勵。')
                .setColor(0xFFFF00);

            await response.edit({ embeds: [fleeEmbed], components: [] });

        } else {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ 戰鬥超時')
                .setDescription('你沒有及時回應，戰鬥結束。')
                .setColor(0xFF0000);

            await response.edit({ embeds: [timeoutEmbed], components: [] });
        }
    });
}

// 玩家攻擊處理
async function handlePlayerAttack(battleState) {
    const baseDamage = battleState.player.attack;
    const critChance = 0.1;
    const critMultiplier = 1.5;

    let damage = Math.floor(Math.random() * (baseDamage * 0.2)) + baseDamage;
    let isCrit = Math.random() < critChance;

    if (isCrit) {
        damage = Math.floor(damage * critMultiplier);
    }

    damage = Math.max(1, damage - battleState.enemy.defense);
    battleState.enemy.hp -= damage;

    let message = `⚔️ 你造成 ${damage} 點傷害`;
    if (isCrit) message += ' 💥 (暴擊！)';
    message += ` 給 ${battleState.enemy.name}！`;

    battleState.log.push(message);
}

// 敵人回合處理
async function handleEnemyTurn(battleState, interaction) {
    const actions = ['attack'];
    if (battleState.enemy.skills.includes('rage') && battleState.enemy.hp < battleState.enemy.maxHp * 0.3) {
        actions.push('rage');
    }
    if (battleState.enemy.skills.includes('poison') && Math.random() < 0.3) {
        actions.push('poison');
    }
    if (battleState.enemy.skills.includes('fire_breath') && Math.random() < 0.2) {
        actions.push('fire_breath');
    }
    if (battleState.enemy.skills.includes('curse') && Math.random() < 0.1) {
        actions.push('curse');
    }

    const action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'attack') {
        await handleEnemyAttack(battleState);
    } else if (action === 'rage') {
        battleState.log.push(`😡 ${battleState.enemy.name} 進入狂暴狀態！攻擊力提升！`);
        battleState.enemy.attack = Math.floor(battleState.enemy.attack * 1.5);
        battleState.enemy.effects.push({ name: '狂暴', duration: 3, type: 'buff' });
        await handleEnemyAttack(battleState);
    } else if (action === 'poison') {
        battleState.log.push(`🧪 ${battleState.enemy.name} 釋放毒氣！你中毒了！`);
        battleState.player.effects.push({ name: '中毒', duration: 3, type: 'debuff', damage: 5 });
    } else if (action === 'fire_breath') {
        const damage = Math.floor(battleState.enemy.attack * 1.2);
        const actualDamage = Math.max(1, damage - battleState.player.defense);
        battleState.player.hp -= actualDamage;
        battleState.log.push(`🔥 ${battleState.enemy.name} 噴射火焰！造成 ${actualDamage} 點傷害！`);
    } else if (action === 'curse') {
        battleState.log.push(`👻 ${battleState.enemy.name} 詛咒你！防禦力下降！`);
        battleState.player.defense = Math.floor(battleState.player.defense * 0.7);
        battleState.player.effects.push({ name: '詛咒', duration: 2, type: 'debuff' });
    }

    processEffects(battleState);

    if (battleState.player.hp <= 0) return 'lose';
    if (battleState.enemy.hp <= 0) return 'win';

    battleState.turn = 'player';
    battleState.round++;

    const embed = createBattleEmbed(battleState);
    const buttons = createActionButtons(battleState);

    await interaction.editReply({ embeds: [embed], components: [buttons] });
}

// 敵人攻擊處理
async function handleEnemyAttack(battleState) {
    let damage = Math.floor(Math.random() * (battleState.enemy.attack * 0.3)) + battleState.enemy.attack;
    damage = Math.max(1, damage - battleState.player.defense);

    if (battleState.player.defending) {
        damage = Math.floor(damage * 0.5);
        battleState.player.defending = false;
        battleState.log.push(`🛡️ 防禦生效！傷害減少50%！`);
    }

    battleState.player.hp -= damage;
    battleState.log.push(`💥 ${battleState.enemy.name} 造成 ${damage} 點傷害給你！`);
}

// 寵物行動處理
async function handlePetAction(battleState) {
    if (!battleState.player.pet || battleState.player.pet.hp <= 0) return;

    const pet = battleState.player.pet;
    const actions = ['attack'];

    if (pet.skills && pet.skills.length > 0) {
        actions.push(...pet.skills);
    }

    const action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'attack') {
        const damage = Math.floor(Math.random() * 10) + pet.attack;
        const actualDamage = Math.max(1, damage - battleState.enemy.defense);
        battleState.enemy.hp -= actualDamage;
        battleState.log.push(`🐾 ${pet.name} 攻擊造成 ${actualDamage} 點傷害！`);
    } else if (action === 'heal') {
        const heal = Math.floor(Math.random() * 15) + 10;
        battleState.player.hp = Math.min(battleState.player.maxHp, battleState.player.hp + heal);
        battleState.log.push(`💚 ${pet.name} 治療你 ${heal} 點HP！`);
    } else if (action === 'buff') {
        battleState.player.attack = Math.floor(battleState.player.attack * 1.2);
        battleState.player.effects.push({ name: '鼓舞', duration: 2, type: 'buff' });
        battleState.log.push(`⚡ ${pet.name} 鼓舞你！攻擊力提升！`);
    }
}

// 處理狀態效果
function processEffects(battleState) {
    battleState.player.effects = battleState.player.effects.filter(effect => {
        effect.duration--;

        if (effect.type === 'debuff' && effect.damage) {
            battleState.player.hp -= effect.damage;
            battleState.log.push(`☠️ ${effect.name}造成 ${effect.damage} 點傷害！`);
        }

        return effect.duration > 0;
    });

    battleState.enemy.effects = battleState.enemy.effects.filter(effect => {
        effect.duration--;

        if (effect.type === 'debuff' && effect.damage) {
            battleState.enemy.hp -= effect.damage;
            battleState.log.push(`☠️ ${battleState.enemy.name} 受到${effect.name} ${effect.damage} 點傷害！`);
        }

        return effect.duration > 0;
    });
}

// 技能選擇處理
async function handleSkillSelection(interaction, battleState) {
    const skills = [
        { id: 'power_strike', name: '威力一擊', description: '造成雙倍傷害', cost: 20 },
        { id: 'heal', name: '治療', description: '恢復30 HP', cost: 15 },
        { id: 'poison_attack', name: '毒擊', description: '造成傷害並中毒敵人', cost: 25 }
    ];

    const embed = new EmbedBuilder()
        .setTitle('✨ 選擇技能')
        .setDescription('選擇要使用的技能：')
        .setColor(0x9932CC);

    skills.forEach(skill => {
        embed.addFields({
            name: `${skill.name} (${skill.cost} MP)`,
            value: skill.description,
            inline: true
        });
    });

    const buttons = skills.map(skill =>
        new ButtonBuilder()
            .setCustomId(`skill_${skill.id}`)
            .setLabel(skill.name)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.update({ embeds: [embed], components: [row] });
}
