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
                    markers={[16, 20, 24, 28, 32, 40, 42, 44, 48, 56, 60, 64]}
                    initialValue={this.props.getSetting('size', 48)}
                    onValueChange={val => this.props.updateSetting('size', val)}
                    stickToMarkers={true}
                    note={"The size (in pixels) of the rendered emojis. 40-64 is recommended as it's the closest to regular emojis."}
                >
                    Emoji Size
                </SliderInput>
                <SwitchItem
                    note='Whether to replace emojis that are unable to be used (may be due to permissions or boosts expiring).'
                    value={this.props.getSetting('unavailable', true)}
                    onChange={() => this.props.toggleSetting('unavailable')}
                >
                    Replace Unavailable Emojis
                </SwitchItem>
            </div>
        )
    }
}
