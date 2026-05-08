import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    StringSelectMenuBuilder
} from "discord.js";

import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// -----------------------------
// 起動時
// -----------------------------
client.once(Events.ClientReady, async () => {

    console.log(`ログインしました: ${client.user.tag}`);

    const channel = client.channels.cache.find(
        ch => ch.name === "🏭｜工場利用"
    );

    if (!channel) return;

    const button = new ButtonBuilder()
        .setCustomId("open_form")
        .setLabel("申請する")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🏭");

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
        content: "🏭 工場利用申請\nボタンから申請してください。",
        components: [row]
    });
});

// -----------------------------
// ボタン押下
// -----------------------------
client.on(Events.InteractionCreate, async interaction => {

    // フォームを開く
    if (interaction.isButton()) {

        if (interaction.customId === "open_form") {

            const modal = new ModalBuilder()
                .setCustomId("reservation_modal")
                .setTitle("🏭｜工場利用");

            const dateInput = new TextInputBuilder()
                .setCustomId("date")
                .setLabel("利用日（複数可）")
                .setPlaceholder("例: 2026/05/10, 2026/05/11")
                .setStyle(TextInputStyle.Short);

            const peopleInput = new TextInputBuilder()
                .setCustomId("people")
                .setLabel("利用人数")
                .setPlaceholder("例: 3")
                .setStyle(TextInputStyle.Short);

            const row1 = new ActionRowBuilder().addComponents(dateInput);
            const row2 = new ActionRowBuilder().addComponents(peopleInput);

            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
        }
    }

    // モーダル送信
    if (interaction.isModalSubmit()) {

        if (interaction.customId === "reservation_modal") {

            const date = interaction.fields.getTextInputValue("date");
            const people = interaction.fields.getTextInputValue("people");

            const select = new StringSelectMenuBuilder()
                .setCustomId("place_select")
                .setPlaceholder("利用場所を選択")
                .setMinValues(1)
                .setMaxValues(2)
                .addOptions([
                    {
                        label: "機械室",
                        value: "機械室"
                    },
                    {
                        label: "木工室",
                        value: "木工室"
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(select);

            await interaction.reply({
                content: `利用人数: ${people}人\n利用場所を選択してください。`,
                components: [row],
                ephemeral: true
            });

            client.tempData ??= {};

            client.tempData[interaction.user.id] = {
                date,
                people
            };
        }
    }

    // 場所選択
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === "place_select") {

            const data = client.tempData[interaction.user.id];

            if (!data) {
                await interaction.reply({
                    content: "データが見つかりません。",
                    ephemeral: true
                });
                return;
            }

            const channel = interaction.guild.channels.cache.find(
                ch => ch.name === "🗓️｜利用予定"
            );

            if (!channel) {
                await interaction.reply({
                    content: "送信先チャンネルが見つかりません。",
                    ephemeral: true
                });
                return;
            }

            const placesText = interaction.values.join("・");

            const entries = data.date.split(",");

            let message = "🏭｜工場利用申請\n\n";

            for (let e of entries) {

                e = e.trim();

                const dt = new Date(e);

                const weekday = dt.getDay();

                let time;

                if (weekday >= 1 && weekday <= 5) {
                    time = "平日 17:00〜22:00";
                } else {
                    time = "休日 9:00〜17:00";
                }

                message +=
                    `【利用日】${e}\n` +
                    `【利用時間】${time}\n` +
                    `【利用場所】${placesText}\n` +
                    `【利用人数】${data.people}人\n\n`;
            }

            message += `【申請者】<@${interaction.user.id}>`;

            await channel.send({
                content: message
            });

            await interaction.reply({
                content: "申請を送信しました！",
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);