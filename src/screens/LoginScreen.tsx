import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Button, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginWithGoogle } from '../services/authService';

type LoginNavigationParamList = {
    Login: undefined;
    Initial: undefined;
};

export default function LoginScreen() {
    const[username, setUsername] = useState('');
    const[password, setPassword] = useState('');
    const navigation = useNavigation<NativeStackNavigationProp<LoginNavigationParamList>>();

    useEffect(() => {
        const handleUrl = ({ url }: { url: string }) => {
            if (!url.startsWith('ffmpeg1:/oauthredirect') && !url.startsWith('ffmpeg1://oauthredirect')) {
                return;
            }

            console.log('[LoginScreen] OAuth callback URL:', url);

            const hash = url.split('#')[1] ?? '';
            const hashParams = new URLSearchParams(hash);
            const tokenFromHash = hashParams.get('access_token');

            if (tokenFromHash) {
                console.log('[LoginScreen] Token recovered from deep link callback');
                Alert.alert('Google Login', 'Login success (deep-link callback).');
                return;
            }

            const parsed = Linking.parse(url);
            const qp = parsed.queryParams ?? {};
            const tokenFromQuery = typeof qp.access_token === 'string' ? qp.access_token : null;

            if (tokenFromQuery) {
                console.log('[LoginScreen] Token recovered from callback query');
                Alert.alert('Google Login', 'Login success (callback query token).');
                return;
            }

            const err = typeof qp.error === 'string' ? qp.error : 'unknown_error';
            console.log('[LoginScreen] OAuth callback without token, error:', err);
            Alert.alert('Google Login', `Callback without token (${err}).`);
        };

        const sub = Linking.addEventListener('url', handleUrl);
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleUrl({ url });
            }
        });

        return () => {
            sub.remove();
        };
    }, []);

    const login = () => {
        console.log('Username: ', username);
        console.log('Password: ', password);
    };

  const handleLogin = async () => {
        try {
            console.log('[LoginScreen] Google login pressed');
            const token = await loginWithGoogle();

            if (token) {
                console.log('[LoginScreen] Logged in, token:', token);
                Alert.alert('Google Login', 'Login success (token received).');
                navigation.replace('Initial');
                // ovdje možeš poslati token backendu
            } else {
                console.log('[LoginScreen] Login failed or cancelled');
                Alert.alert('Google Login', 'Login failed or cancelled.');
                navigation.replace('Login');
            }
        } catch (error) {
            console.error('[LoginScreen] Login exception:', error);
            Alert.alert('Google Login Error', String(error));
            navigation.replace('Login');
    }
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
            <Button title="Login with Google" onPress={handleLogin} />
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