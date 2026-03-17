import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InitialScreen from '../screens/InitialScreen/InitialScreen';
import FiltersScreen from '../screens/FiltersScreen';
import SourceSeparationPlayerScreen from '../screens/SourceSeparationScreen/SourceSeparationPlayerScreen';
import * as DocumentPicker from 'expo-document-picker';

export type InitialStackParamList = {
  InitialScreen: undefined;
  EditorScreen: { file: DocumentPicker.DocumentPickerAsset };
  SeparationScreen: { file: DocumentPicker.DocumentPickerAsset };
};

const InitialStack = createNativeStackNavigator<InitialStackParamList>();

export default function InitialNavigator() {
  return (
    <InitialStack.Navigator>
      <InitialStack.Screen name="InitialScreen" component={InitialScreen} />
      <InitialStack.Screen name="EditorScreen" component={FiltersScreen} />
      <InitialStack.Screen name="SeparationScreen" component={SourceSeparationPlayerScreen} />
    </InitialStack.Navigator>
  );
}
