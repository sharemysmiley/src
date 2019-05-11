import React from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

export default class Pulse extends React.Component {
    constructor(props) {
        super(props);

        this.anim = new Animated.Value(0);
    }

    componentDidMount() {
        Animated.loop(
            Animated.timing(this.anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.in
            })
        ).start()
    }

    render() {
        const { size, pulseMaxSize, backgroundColor } = this.props;

        return (
            <View style={[styles.circleWrapper, {
                width: pulseMaxSize,
                height: pulseMaxSize,
                marginLeft: -pulseMaxSize/2,
                marginTop: -pulseMaxSize/2,
            }]}>
                <Animated.View
                    style={[styles.circle, {
                        backgroundColor,
                        width: this.anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [size, pulseMaxSize]
                        }),
                        height: this.anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [size, pulseMaxSize]
                        }),
                        borderRadius: pulseMaxSize/2,
                        opacity: this.anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0]
                        })
                    }]}
                />
            </View>
        );
    }
}


const styles = StyleSheet.create({
    circleWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute'
    }
});