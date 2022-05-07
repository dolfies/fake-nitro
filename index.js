const { Plugin } = require('powercord/entities');
const { inject } = require('powercord/injector');
const { getModule, messages } = require('powercord/webpack');

const Settings = require('./settings.jsx');

module.exports = class FreeNitro extends Plugin {
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

    getEmojiUrl(url) {
        var size = this.settings.get('size', 48);
        return url.split('?')[0] + `?size=${size}&quality=lossless`;
    }

    replaceEmoji(content, emoji) {
        return content.replace(`<${emoji.animated ? 'a' : ''}:${emoji.originalName || emoji.name}:${emoji.id}>`, this.getEmojiUrl(emoji.url));
    }

    async startPlugin() {
        this.registerSettings();

        const emojis = await getModule([ 'getDisambiguatedEmojiContext' ])
        const emojiPicker = await getModule([ 'useEmojiSelectHandler' ]);

        // Replace emojis with URLs
        inject('emojiReplace', messages, 'sendMessage', (params) => {
            var args = params[1];

            for (var emoji of args.invalidEmojis) {
                args.content = this.replaceEmoji(args.content, emoji);
            };

            if (this.settings.get('unavailable', true)) {
                for (var emoji of args.validNonShortcutEmojis) {
                    if (!emoji.available) {
                        args.content = this.replaceEmoji(args.content, emoji);
                    };
                };
            };

            args.validNonShortcutEmojis = args.validNonShortcutEmojis.concat(args.invalidEmojis);
            args.invalidEmojis = [];

            return params;
        }, true);

        // Show all emojis
        inject('emojiPatch', emojis, 'searchWithoutFetchingLatest', (params, res) => {
            res.unlocked = res.unlocked.concat(res.locked);
            res.locked = [];
            return res;
        }, false);

        // Show all emojis in emoji picker
        inject('emojiPickerPatch', emojiPicker, 'useEmojiSelectHandler', (params, res) => {
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
    }

    pluginWillUnload() {
        this.unregisterSettings();
    };
}
