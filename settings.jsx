const { React } = require('powercord/webpack');
const { SliderInput, SwitchItem } = require('powercord/components/settings');

module.exports = class Settings extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <SliderInput
                    markers={[16, 20, 22, 24, 28, 32, 40, 44, 48, 56, 60, 64]}
                    initialValue={this.props.getSetting('emojiSize', 48)}
                    onValueChange={val => this.props.updateSetting('emojiSize', val)}
                    stickToMarkers={true}
                    note={"The size (in pixels) of the rendered emoji images. 40-64 is recommended as it's the closest to regular emojis."}
                >
                    Emoji Size
                </SliderInput>
                <SliderInput
                    markers={[64, 80, 96, 100, 128, 160]}
                    initialValue={this.props.getSetting('stickerSize', 160)}
                    onValueChange={val => this.props.updateSetting('stickerSize', val)}
                    stickToMarkers={true}
                    note={"The size (in pixels) of the rendered sticker images. 160 is recommended as it's the closest to regular stickers."}
                >
                    Sticker Size
                </SliderInput>
                <SwitchItem
                    note='Whether to replace emojis/stickers that are unable to be used (may be due to permissions or boosts expiring).'
                    value={this.props.getSetting('unavailable', true)}
                    onChange={() => this.props.toggleSetting('unavailable')}
                >
                    Replace Unavailable Emojis & Stickers
                </SwitchItem>
                <SwitchItem
                    note="Whether to abuse Discord's markdown rendering to hide the image URLs. This will not work on messages with less than ~1000 characters left in the limit, and may not work on certain mobile devices."
                    value={this.props.getSetting('spoilers', false)}
                    onChange={() => this.props.toggleSetting('spoilers')}
                >
                    Hide Image Links
                </SwitchItem>
            </div>
        )
    }
}
