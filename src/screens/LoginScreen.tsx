import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isStoredGoogleSessionValid, loginWithGoogle } from '../services/oAuthService';
import { LoginRequest } from '../models/auth/LoginRequest';
import { login, logout } from '../services/authService';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../utils/authStorage';
import { LogoutRequest } from '../models/auth/LogoutRequest';
import { clearClient, getClient, saveClient } from '../utils/clientStorage';

type LoginNavigationParamList = {
    Login: undefined;
    Initial: undefined;
};

export default function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<LoginNavigationParamList>>();
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        let mounted = true;

        const runSilentCheck = async () => {
            try {
                const isValid = await isStoredGoogleSessionValid();

                if (!mounted) {
                    return;
                }

                if (isValid) {
                    navigation.replace('Initial');
                    return;
                }
            } finally {
                if (mounted) {
                    setIsCheckingSession(false);
                }
            }
        };

        void runSilentCheck();

        return () => {
            mounted = false;
        };
    }, [navigation]);

    const handleLogin = async () => {
        try {
            const token = await loginWithGoogle();

            if (token) {
                navigation.replace('Initial');
            } else {
                Alert.alert('Google Login', 'Login failed or cancelled.');
            }
        } catch (error) {
            Alert.alert('Google Login Error', String(error));
        }
    };

    if (isCheckingSession) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.subtitle}>Provjera prijave...</Text>
            </View>
        );
    }

    async function handleLocalLogin() {
        try {
            const request: LoginRequest = {username, password};
            const response = await login(request);
            await saveTokens(response.accessToken, response.refreshToken);
            await saveClient({
                id: response.id,
                name: response.name,
                surname: response.surname,
                username: response.username,
                email: response.email
            });
            navigation.replace("Initial");
            // Alert.alert("Login uspješan", `Dobio si token: ${response.accessToken}`);
        } catch (error: any) {
            if(error.status === 401)
                Alert.alert("Greska", "Login nije uspio, 401");
            else
                Alert.alert("Greška", error.message || "Login nije uspio");
        }
    }

    async function handleLogout() {
         try {
            const token = await getRefreshToken();
            if(token === null)
                return;
            const request: LogoutRequest = { clientId: 2, refreshToken: token };
            await logout(request);
            await clearTokens();
            await clearClient();
            Alert.alert("Logout uspješan", `Odjavio se`);
        } catch (error: any) {
            if(error.status === 401)
                Alert.alert("Greska", "Logout nije uspio, 401");
            else
                Alert.alert("Greška", error.message || "Login nije uspio");
        }
    }

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput 
                placeholder='Username'
                value={username}
                onChangeText={setUsername}
                style={styles.input}
            />
            <TextInput 
                placeholder='Password'
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />
            <Button title="Login" onPress={handleLocalLogin} />
            <Button title='Logout' onPress={handleLogout}/>
            <Button title='Stari JWT' onPress={async () => {
                console.log(await getAccessToken());
                const refresh = await getRefreshToken() || "";
                const jwt = "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiIyIiwic3ViIjoid2ljayIsImV4cCI6MTc3OTEzNzkzMn0.vj0zuSpKyep0i8z2MXxgXErcJlyylFgbAA3rKe3vy-r6jWrRAJzlYyGC1eInvFvPWc14gEGcQOIEzRSRRXaABg";
                await clearTokens();
                await saveTokens(jwt, refresh);
                console.log(await getAccessToken());
            }} />
            {/* <Button title="Continue with Google" onPress={handleLogin} /> */}
            <Button
                title="Ispisi klijenta"
                onPress={async () => {
                    const client = await getClient();
                    console.log(client);
                    const access = await getAccessToken();
                    const refresh = await getRefreshToken();
                    console.log(access);
                    console.log(refresh);
                    // Alert.alert("Klijent", client ? `${client.name} ${client.surname}` : "Nema klijenta");
                }}
            />
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
    subtitle: {
        marginTop: 12,
        textAlign: 'center',
        color: '#666',
    },
    input: { 
        borderWidth: 1, 
        marginBottom: 10, 
        padding: 8 
    }
});