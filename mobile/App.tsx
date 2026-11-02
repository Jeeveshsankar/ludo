import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppStore } from './src/store/gameStore';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { OnlineLobbyScreen } from './src/screens/OnlineLobbyScreen';
import { Colors } from './src/theme';

export default function App() {
  const { currentScreen, setScreen } = useAppStore();

  const navigation = {
    navigate: (screen: any) => setScreen(screen),
    goBack: () => setScreen('Home'),
  };

  return (
    <View style={styles.root}>
      {currentScreen === 'Home' && <HomeScreen navigation={navigation} />}
      {currentScreen === 'Game' && <GameScreen navigation={navigation} />}
      {(currentScreen === 'OnlineMode' ||
        currentScreen === 'CreateRoom' ||
        currentScreen === 'JoinRoom' ||
        currentScreen === 'Matchmaking' ||
        currentScreen === 'Lobby') && (
        <OnlineLobbyScreen navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.pageBackground || '#F8F9FE',
  },
});
