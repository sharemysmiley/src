import React, {Component} from 'react';
import {View, Button, Text, ActivityIndicator, StyleSheet} from 'react-native';
import firebase from 'react-native-firebase';
import type {Notification} from 'react-native-firebase';
import NearbyConnection, {Strategy} from 'react-native-google-nearby-connection';
import Pulse from './Pulse';

const serviceID = "Smiley service ID";

const primaryColor = "#3FA9F5";

class Nearby extends Component{
    constructor(props) {
        super(props);
        this.state = {
            myPushToken: null,
            myPhone:this.props.user.phoneNumber,
            onAdvertisingStarted: false,
            onDiscoveryStarted: false,
            myEndpointName: undefined,
            otherEndpoints: [],
            payloads: [],
            tokens:[],
            isLoading: false,
            message: '',
        };
        this.ref = firebase.firestore().collection('users');
        this.db = firebase.firestore();
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.onAdvertisingStarted !== this.state.onAdvertisingStarted ){
            return true;
        }
        if(nextState.onDiscoveryStarted !== this.state.onDiscoveryStarted ){
            return true;
        }
        if(nextState.myEndpointName !== this.state.myEndpointName ){
            return true;
        }
        if(nextState.otherEndpoints !== this.state.otherEndpoints ){
            return true;
        }
        if(nextState.payloads !== this.state.payloads ){
            return true;
        }
        if(nextState.tokens !== this.state.tokens ){
            return true;
        }
        if(nextState.isLoading !== this.state.isLoading ){
            return true;
        }
        if(nextState.message !== this.state.message ){
            return true;
        }

        return false;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(prevState.otherEndpoints !== this.state.otherEndpoints){
            this.handleConnectToEndpoint();
        }
    }

    componentWillMount() {
        this.db.settings({timestampsInSnapshots: true});
    }

    componentWillUnmount() {
        this.notificationListener();
    }

    componentDidMount() {
        this.notificationListener = firebase.notifications().onNotification((notification: Notification) => {
            // Process your notification as required
            this.displayLocalNotification(notification);
        });

        firebase.messaging().getToken().then(token => {

            // add phone to firebase firestore
            this.ref.doc(this.props.user.phoneNumber).set({
                phoneNumber: this.props.user.phoneNumber
            }).then(() => {
                    console.log('Added!');
                }
            ).catch(() => {
                    console.log('error!');
                }
            );

            this.setState({myPushToken:token});
        });

        // Google nearby
        this.handleSubmitCreateService(serviceID);

        NearbyConnection.onAdvertisingStarted(({endpointName, serviceId}) => {
            this.setState({onAdvertisingStarted: true});
            NearbyConnection.startDiscovering(serviceID, Strategy.P2P_CLUSTER);
        });

        NearbyConnection.onDiscoveryStarted(({serviceId}) => {
            this.setState({onDiscoveryStarted: true});
        });

        NearbyConnection.onEndpointDiscovered(({endpointId, endpointName, serviceId}) => {

            // An endpoint has been discovered we can connect to
            let newEndpoint = {endpointId, endpointName, serviceId, status:"Disconnected"};

            let duplicateEndpoint = this.state.otherEndpoints.find(el => {return el.endpointId === newEndpoint.endpointId && el.endpointName === newEndpoint.endpointName});

            if(newEndpoint){
                this.setState({otherEndpoints: [...this.state.otherEndpoints, newEndpoint]},() => {
                    if(duplicateEndpoint){
                        this.setState((prevState) => ({
                            otherEndpoints: prevState.otherEndpoints.filter((_, i) => i !== prevState.otherEndpoints.length -1)
                        }));
                    }
                });
            }
        });

        NearbyConnection.onConnectionInitiatedToEndpoint(({endpointId, endpointName, authenticationToken, serviceId, incomingConnection}) => {
            NearbyConnection.acceptConnection(serviceId, endpointId);
        });

        NearbyConnection.onConnectedToEndpoint(({endpointId, endpointName, serviceId}) => {
            if(endpointId){
                this.setState({
                    otherEndpoints: this.state.otherEndpoints.map(el => (el.endpointId === endpointId ? Object.assign({}, el, { status:"Connected" }) : el))
                });
            }

            NearbyConnection.sendBytes(
                serviceID,
                endpointId,
                this.state.myPushToken
            );
        });

        // Payload has been received
        NearbyConnection.onReceivePayload(({serviceId, endpointId, payloadType, payloadId}) => {

            NearbyConnection.readBytes(serviceId, endpointId, payloadId)
                .then(({type, bytes, payloadId, filename, metadata, streamType}) => {

                    let newPayload = {endpointId,bytes};

                    this.setState({
                        payloads: [...this.state.payloads, newPayload],
                        tokens:[...this.state.tokens, bytes]
                    });
                });
        });

        // Disconnected from an endpoint
        NearbyConnection.onDisconnectedFromEndpoint(({endpointId,endpointName,serviceId}) => {
            console.log("Disconnected ID: " + endpointId);
            // ToastAndroid.showWithGravity("onDisconnectedFromEndpoint(" + endpointId +  ")", ToastAndroid.LONG, ToastAndroid.CENTER);
            this.updateDisconnectedEndpoint(endpointId);
            this.deleteDisconnectedEndpointToken(endpointId);
        });

        // Failed to connect to an endpoint
        NearbyConnection.onEndpointConnectionFailed(({endpointId,endpointName,serviceId,statusCode}) => {
            if(endpointId){
                this.setState({
                    otherEndpoints: this.state.otherEndpoints.map(el => (el.endpointId === endpointId ? Object.assign({}, el, { status:"Disconnected" }) : el))
                });
            }
        });
    }

    displayLocalNotification = (notification) => {
        const channel = new firebase.notifications.Android.Channel(
            'smiley-channel',
            'Smiley Channel',
            firebase.notifications.Android.Importance.Max
        ).setDescription('Smiley channel');

        const localNotification = new firebase.notifications.Notification({
            sound: 'default',
            show_in_foreground: true,
        })
            .setNotificationId('notificationId')
            .setTitle(notification._title)
            .setBody(notification._body)
            .android.setChannelId('smiley-channel')
            .android.setColor(primaryColor) // you can set a color here
            .android.setSmallIcon('ic_stat_name')
            .android.setPriority(firebase.notifications.Android.Priority.High);

        // Create the channel
        firebase.notifications().android.createChannel(channel);

        firebase.notifications().displayNotification(localNotification)
            .catch(err => console.error(err));
    };

    sendMsg = () => {
        this.setState({isLoading:true});

        let user = firebase.auth().currentUser;

        this.db.settings({timestampsInSnapshots: true});

        this.ref.doc(user._user.phoneNumber).update({
            sendToToken: this.state.tokens
        }).then(() => {
                this.setState({isLoading:false, message:'Sent!'}, () => {
                    setTimeout(() => {
                        this.setState({message:""});
                    }, 2500);
                });
            }
        ).catch(() => {
                this.setState({isLoading:false, message:"Error! Try again"}, () => {
                    setTimeout(() => {
                        this.setState({message:""});
                    }, 2500);
                });
            }
        );
    };

    handleConnectToEndpoint = () => {
        this.state.otherEndpoints.forEach(endpoint => {
            if(endpoint.status === "Disconnected" && this.state.myEndpointName > parseInt(endpoint.endpointName, 10)){
                NearbyConnection.connectToEndpoint(serviceID, endpoint.endpointId);
                this.setState({
                    otherEndpoints: this.state.otherEndpoints.map(el => (el.endpointId === endpoint.endpointId ? Object.assign({}, el, { status:"connecting" }) : el))
                });
            }
        });
    };

    deleteDisconnectedEndpointToken = (endpointId) => {
        let disconnectedPayload = this.state.payloads.find(payload => {return payload.endpointId === endpointId});
        let disconnectedToken = (disconnectedPayload) ? disconnectedPayload.bytes : null;

        if(disconnectedToken !== null){
            this.setState(prevState => {
                let tokens = prevState.tokens.filter(token => token !== disconnectedToken);
                let payloads = prevState.payloads.filter(payload => payload.endpointId !== endpointId);
                return { payloads, tokens };
            });
        }
    };

    updateDisconnectedEndpoint = (endpointId) => {
        this.setState({
            otherEndpoints: this.state.otherEndpoints.map(el => (el.endpointId === endpointId ? Object.assign({}, el, { status:"Disconnected" }) : el))
        });
    };

    handleSubmitCreateService = (value) => {
        const serviceId = value;
        const myEndpointName = this.state.myPhone.slice(1,this.state.myPhone.length);
        const myPhoneNumber = parseInt(myEndpointName, 10);

        this.setState({myEndpointName: myPhoneNumber},()=>{
            NearbyConnection.startAdvertising(myEndpointName, serviceId, Strategy.P2P_CLUSTER);
        });
    };

    render() {
        return (
            <View style={styles.container}>

                <Text style={styles.hintStyle}>Nearby users can only discover you and will appear here when you both have this app open (running in the foreground).</Text>
                <Pulse {...this.props} />

                <View style={styles.radar}>
                    <Text style={styles.radarLabel}>Nearby:</Text>
                    <Text style={styles.radarIndicator}>{this.state.tokens.length}</Text>
                </View>

                {this.state.tokens.length > 0 && !this.state.isLoading &&
                    <View style={styles.buttonStyle}>
                        <Button title="Share my smiley" color={primaryColor} onPress={this.sendMsg}/>
                    </View>
                }

                <View style={styles.loaderStyle}>
                    {this.state.isLoading ? <ActivityIndicator size="large" color={primaryColor} /> : null}
                </View>

                <Text style={styles.messageStyle}>{this.state.message}</Text>

            </View>
        );
    }
}

export default Nearby;

Nearby.defaultProps = {
    size: 100,
    pulseMaxSize: 200,
    backgroundColor: primaryColor
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flex:1
    },
    hintStyle:{
        position: 'absolute',
        top:'5%',
        textAlign:'center'
    },
    radar: {
        width: 100,
        height: 100,
        backgroundColor: 'white',
        borderRadius: 100/2,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: primaryColor,
        borderWidth: 4,
        position: 'absolute'
    },
    radarLabel: {
        color: primaryColor
    },
    radarIndicator: {
        fontSize: 30,
        fontWeight: 'bold'
    },
    buttonStyle:{
        position: 'absolute',
        bottom:'5%',
        width:"100%",
        marginLeft:"5%"
    },
    loaderStyle:{
        position: 'absolute',
        bottom:'5%'
    },
    messageStyle: {
        position: 'absolute',
        bottom:'0%',
        color: primaryColor,
        fontWeight: 'bold'
    },
});
