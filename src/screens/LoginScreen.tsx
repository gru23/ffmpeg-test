import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isStoredGoogleSessionValid, loginWithGoogle } from '../services/authService';

type LoginNavigationParamList = {
    Login: undefined;
    Initial: undefined;
};

export default function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<LoginNavigationParamList>>();
    const [isCheckingSession, setIsCheckingSession] = useState(true);

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

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
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
    subtitle: {
        marginTop: 12,
        textAlign: 'center',
        color: '#666',
    },
});