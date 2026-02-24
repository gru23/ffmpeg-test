import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Button } from 'react-native';

export default function LoginScreen() {
    const[username, setUsername] = useState('');
    const[password, setPassword] = useState('');

    const login = () => {
        console.log('Username: ', username);
        console.log('Password: ', password);
    };

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput 
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title='Login' onPress={login} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1, 
        borderColor: '#ccc', 
        padding: 10, 
        marginBottom: 15, 
        borderRadius: 5,
    },
});