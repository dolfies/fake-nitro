const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');

const Settings = require('./settings.jsx');
const hider = "||\u200b||".repeat(200);

module.exports = class FreeNitro extends Plugin {
    async getModules() {
        this.GLOBAL_ENV = (await getModule([ 'GLOBAL_ENV' ])).GLOBAL_ENV;
        this.endpoints = (await getModule([ 'Endpoints' ])).Endpoints;
        this.stickers = await getModule([ 'getStickerById' ]);
        this.emojis = await getModule([ 'searchWithoutFetchingLatest' ])
        this.emojiPicker = await getModule([ 'useEmojiSelectHandler' ]);
        this.getLastSelectedGuildId = await getModule([ 'getLastSelectedGuildId' ]);
        this.currentUser = await getModule([ 'getCurrentUser' ]);
        this.stickerSendability = await getModule([ 'isSendableSticker' ]);
        this.messages = await getModule([ 'sendMessage' ]);
        this.premiumQualitySettings = await getModule([ 'ApplicationStreamSettingRequirements' ]);

        this.originalPremiumQualitySettings = Object.assign({}, this.premiumQualitySettings.ApplicationStreamSettingRequirements);
    }

    registerSettings() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Fake Nitro',
            render: Settings
        })
    }

    unregisterSettings() {
        powercord.api.settings.unregisterSettings(this.entityID);
    }

    get user() {
        return this.currentUser.getCurrentUser();
    }

    get currentGuild() {
        return this.getLastSelectedGuildId.getLastSelectedGuildId();
    }

    countInstances(str, substr) {
        return str.split(substr).length - 1;
    }

    getEmojiUrl(emoji) {
        const size = this.settings.get('emojiSize', 48);
        return emoji.url.split('?')[0].replace('webp', 'png') + `?size=${size}`;
    }

    replaceEmoji(content, emoji) {
        const url = this.getEmojiUrl(emoji);
        const str = `<${emoji.animated ? 'a' : ''}:${emoji.originalName || emoji.name}:${emoji.id}>`;
        const instances = this.countInstances(content, str);
        var message = content.replaceAll(str, '');

        if (!message && instances == 1) {  // Special case for just ":emoji:"
            return url;
        };

        if (this.settings.get('spoilers', false)) {
            if (!message.includes(hider)) {
                message = message + hider;
            };
            for (let step = 0; step < instances; step++) {
                message = message + ` ${url + '&'.repeat(step)}`;
            };
            return message;
        }
        else {
            for (let step = 0; step < instances; step++) {
                content = content.replace(str, `${url + '&'.repeat(step)}`);
            };
            return content;
        };
    }

    getSticker(id) {
        return this.stickers.getStickerById(id);
    }

    getStickerUrl(sticker) {
        const size = this.settings.get('stickerSize', 160);
        switch (sticker.format_type) {
            case 1:
                return 'https:' + this.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT + this.endpoints.STICKER_ASSET(sticker.id, 'png') + `?size=${size}`;
            default:
                return
        };
    }

    replaceSticker(content, sticker) {
        const url = this.getStickerUrl(sticker);

        if (!content) {  // Special case for no content
            return url;
        };

        if (this.settings.get('spoilers', false)) {
            if (!content.includes(hider)) {
                content = content + hider;
            };
            return content + ` ${url}`;
        }
        else {
            return content + ` ${url}`;
        };
    }

    async startPlugin() {
        await this.getModules();
        this.registerSettings();

        const unavailable = this.settings.get('unavailable', true);

        // Replace emojis with URLs
        inject('urlReplace', this.messages, '_sendMessage', (params) => {
            const args = params[1];
            const kwargs = params[2];
            const stickerIds = [];

            kwargs.stickerIds = kwargs.stickerIds || []; // Sticker IDs are optional

            for (var emoji of [...new Set(args.invalidEmojis)]) {
                args.content = this.replaceEmoji(args.content, emoji);
            };

            if (unavailable) {
                for (var emoji of [...new Set(args.validNonShortcutEmojis)]) {
                    if (!emoji.available) {
                        args.content = this.replaceEmoji(args.content, emoji);
                    };
                };
            };

            for (var stickerId of kwargs.stickerIds) {
                var sticker = this.getSticker(stickerId);

                if (this.user.hasPremiumPerks) {
                    if (!sticker || sticker.type == 1 || sticker.available) {
                        stickerIds.push(stickerId);
                    }
                    else if (unavailable) {
                        args.content = this.replaceSticker(args.content, sticker);
                    };
                }
                else {
                    if (!sticker) {
                        continue;
                    };
                    switch (sticker.type) {
                        case 1: // Standard
                            args.content = this.replaceSticker(args.content, sticker);
                        case 2: // Guild
                            if (this.currentGuild == sticker.guild_id) {
                                if (sticker.available) {
                                    stickerIds.push(stickerId);
                                }
                                else if (unavailable) {
                                    args.content = this.replaceSticker(args.content, sticker);
                                };
                            }
                            else {
                                args.content = this.replaceSticker(args.content, sticker);
                            };
                    };
                };
            }

            args.validNonShortcutEmojis = args.validNonShortcutEmojis.concat(args.invalidEmojis);
            args.invalidEmojis = [];
            kwargs.stickerIds = stickerIds;

            return params;
        }, true);

        // Show all emojis
        inject('emojiPatch', this.emojis, 'searchWithoutFetchingLatest', (params, res) => {
            const unlocked = res.unlocked
            const locked = []

            for (var emoji of res.locked) {
                if (!emoji.available && !unavailable) {
                    locked.push(emoji)
                }
                else {
                    unlocked.push(emoji)
                };
            };

            res.locked = locked;
            return res;
        }, false);

        // Show all emojis in emoji picker
        inject('emojiPickerPatch', this.emojiPicker, 'useEmojiSelectHandler', (params, res) => {
            const { onSelectEmoji, closePopout } = params[0];
            const unavailable = this.settings.get('unavailable', true);

            return (data, state) => {
                if (state.toggleFavorite) {
                    return res.apply(this, arguments);
                };

                if (!data.emoji.available && !unavailable) {
                    return res.apply(this, arguments);
                };

                onSelectEmoji(data.emoji, state.isFinalSelection);
                if (state.isFinalSelection) {
                    closePopout();
                };
            };

        }, false);

        // Show all stickers in sticker picker
        inject('stickerPickerPatch', this.stickerSendability, 'isSendableSticker', (params, res) => {
            const sticker = params[0];

            if (!sticker.type == 1 && !sticker.available && !unavailable) {
                return false;
            };

            if (sticker.format_type == 1) {
                return true;
            };

            return res;
        }, false);

        // Enable premium video qualities
        for (let quality of this.premiumQualitySettings.ApplicationStreamSettingRequirements) {
            delete quality.userPremiumType;
            delete quality.guildPremiumTier;
        };
    }

    pluginWillUnload() {
        uninject('urlReplace');
        uninject('emojiPatch');
        uninject('emojiPickerPatch');
        uninject('stickerPickerPatch');

        this.premiumQualitySettings.ApplicationStreamSettingRequirements = this.originalPremiumQualitySettings;
        this.unregisterSettings();
    }
}
