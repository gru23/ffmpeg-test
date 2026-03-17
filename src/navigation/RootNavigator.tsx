import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import InitialNavigator from './InitialNavigator';

export type RootStackParamList = {
  Login: undefined;
  Initial: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Initial" component={InitialNavigator} />
    </RootStack.Navigator>
  );
}
