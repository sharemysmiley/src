import React, {Component} from 'react';
import {
    View,
    Button,
    Text,
    TextInput,
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import firebase from 'react-native-firebase';
import Nearby from "./Nearby";

const primaryColor = "#3FA9F5";

export default class Auth extends Component {
    constructor(props) {
        super(props);
        this.unsubscribe = null;
        this.state = {
            user: null,
            message: '',
            codeInput: '',
            phoneNumber: '+1',
            confirmResult: null,
            isLoading: false,
        };
    }

    componentDidMount() {
        this.unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.setState({user: user.toJSON()});
            } else {
                // User has been signed out, reset the state
                this.setState({
                    user: null,
                    message: '',
                    codeInput: '',
                    phoneNumber: '+1',
                    confirmResult: null,
                    isLoading: false,
                });
            }
        });
    }

    componentWillUnmount() {
        if (this.unsubscribe) this.unsubscribe();
    }

    signIn = () => {
        const {phoneNumber} = this.state;
        this.setState({isLoading:true});

        firebase.auth().signInWithPhoneNumber(phoneNumber)
            .then(confirmResult => this.setState({confirmResult, isLoading:false, message: ''}))
            .catch(error => this.setState({isLoading:false, message: `Sign In With Phone Number Error: ${error.message}`}));
    };

    confirmCode = () => {
        const {codeInput, confirmResult} = this.state;
        this.setState({isLoading:true});

        if (confirmResult && codeInput.length) {
            confirmResult.confirm(codeInput)
                .then((user) => {
                    this.setState({isLoading:false, message: ''});
                })
                .catch(error => this.setState({isLoading:false, message: `Code Confirm Error: ${error.message}`}));
        }

        if(codeInput.length === 0){
            this.setState({isLoading:false, message: "Please enter code"})
        }

    };

    signOut = () => {
        firebase.auth().signOut();
    };

    renderPhoneNumberInput() {
        const {phoneNumber} = this.state;

        return (
            <View>
                <Text style={styles.title}>Smiley</Text>
                <Text style={styles.subtitle}>Share with people nearby</Text>
                <Text style={styles.inputLabel}>
                    When you tap SIGN IN, Smiley will send a text with verification code. The verified phone number can be used to login.
                    The last 3 digits of your phone number will be your username.
                </Text>
                <TextInput
                    autoFocus
                    style={styles.input}
                    onChangeText={value => this.setState({phoneNumber: value})}
                    placeholder={'Please enter your phone number'}
                    value={phoneNumber}
                />

                { !this.state.isLoading &&
                <Button title="Sign In" styles={styles.button} onPress={this.signIn}/>
                }

                {this.state.isLoading ? <ActivityIndicator size="large" color={primaryColor} /> : null}
            </View>
        );
    }

    renderMessage() {
        const {message} = this.state;

        if (!message.length) return null;

        return (
            <Text style={styles.message}>{message}</Text>
        );
    }

    renderVerificationCodeInput() {
        const {codeInput} = this.state;

        return (
            <View>
                <Text style={styles.inputLabel}>Enter verification code below:</Text>
                <TextInput
                    autoFocus
                    style={styles.input}
                    onChangeText={value => this.setState({codeInput: value})}
                    placeholder={'Please enter code'}
                    value={codeInput}
                />

                {!this.state.isLoading &&
                <Button title="Confirm Code" styles={styles.button} onPress={this.confirmCode}/>
                }

                {this.state.isLoading ? <ActivityIndicator size="large" color={primaryColor} /> : null}
            </View>
        );
    }

    render() {
        const {user, confirmResult} = this.state;
        return (
            <View style={styles.container}>

                {!user && !confirmResult && this.renderPhoneNumberInput()}

                {!user && confirmResult && this.renderVerificationCodeInput()}

                {this.renderMessage()}

                {user && (
                    <Nearby user={user}/>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        padding:'5%'
    },
    title:{
        textAlign:'center',
        color: primaryColor,
        fontWeight: 'bold',
        fontSize: 52,
    },
    subtitle:{
        textAlign:'center',
        color: 'black',
    },
    inputLabel:{
        textAlign:'center',
        marginTop:30,
    },
    input: {
        height: 40,
        marginBottom: 15,
        borderBottomColor: 'gray',
        borderBottomWidth: 1,
    },
    button:{
        color: primaryColor,
    },
    message:{
        color: primaryColor,
        padding: 5
    }
});