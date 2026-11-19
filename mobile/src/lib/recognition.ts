import { requireOptionalNativeModule } from "expo";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
// Expo Go has no speech recognition module; typed commands still work there.
export const recognition = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>("ExpoSpeechRecognition");
