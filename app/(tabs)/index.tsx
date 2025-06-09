import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Font from 'expo-font';

const catPawImg = require('../../assets/images/cat_paw.png');

const upgrades = [
  {
    id: 'houseCat',
    name: '家ネコ',
    price: 10,
    cps: 0.1,
    catImage: require('../../assets/images/cat_house.png'),
  },
  {
    id: 'strayCat',
    name: '野良ネコ',
    price: 100,
    cps: 1,
    catImage: require('../../assets/images/cat_stray.png'),
  },
  {
    id: 'spaceLab',
    name: '宇宙ネコ',
    price: 1000,
    cps: 10,
    catImage: require('../../assets/images/cat_space.png'),
  },
];

export default function HomeScreen() {
  const [nyanki, setNyanki] = useState(0);
  const [autoUpgrades, setAutoUpgrades] = useState({ houseCat: 0, strayCat: 0, spaceLab: 0 });
  const [upgradePrices, setUpgradePrices] = useState({ houseCat: 10, strayCat: 100, spaceLab: 1000 });
  const [hearts, setHearts] = useState([]);
  const [cats, setCats] = useState([]);
  const [fontLoaded, setFontLoaded] = useState(false);
  const isHolding = useRef(false);
  const heartId = useRef(0);
  const catId = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // アニメーション用のAnimated.Valueを用意
  const jumpAnim = useRef(new Animated.Value(0)).current;  // 縦ジャンプ用
  const posX = useRef(new Animated.Value(0)).current;      // 横移動用
  const posY = useRef(new Animated.Value(0)).current;      // 縦移動用（追いかけっこ）

  useEffect(() => {
    Font.loadAsync({ 'Nikumaru': require('../../assets/fonts/07にくまるフォント.otf') })
      .then(() => setFontLoaded(true));
  }, []);

  const totalCps = Object.entries(autoUpgrades).reduce((sum, [key, count]) => {
    const upgrade = upgrades.find(u => u.id === key);
    return sum + (upgrade ? count * upgrade.cps : 0);
  }, 0);

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setNyanki(prev => prev + totalCps * delta);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [totalCps]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isHolding.current) addNyanki(1, null);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const addNyanki = (amount, touchEvent) => {
    setNyanki(prev => prev + amount);
    if (touchEvent) {
      const { pageX, pageY } = touchEvent.nativeEvent;
      const newHeart = {
        id: heartId.current++,
        x: pageX,
        y: pageY,
        anim: new Animated.Value(0),
      };
      setHearts(prev => [...prev, newHeart]);
      Animated.timing(newHeart.anim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      });
    }
  };

  const addCats = (count, upgradeId) => {
    setCats(prevCats => {
      const newCats = [];
      for (let i = 0; i < count; i++) {
        const size = 40 + Math.random() * 40;
        const x = Math.random() * (screenWidth - size);
        const y = Math.random() * (screenHeight - size - 200);
        newCats.push({ id: catId.current++, x, y, size, upgradeId });
      }
      return prevCats.length + newCats.length > 300 ? prevCats : [...prevCats, ...newCats];
    });
  };

  const buyUpgrade = (id) => {
    const price = upgradePrices[id];
    if (nyanki >= price) {
      setNyanki(nyanki - price);
      setAutoUpgrades(prev => {
        const newCount = (prev[id] || 0) + 1;
        addCats(1, id);
        return { ...prev, [id]: newCount };
      });
      setUpgradePrices(prev => ({ ...prev, [id]: Math.ceil(price * 1.15) }));
    }
  };

  // 猫肉球ボタンを押した時のアニメーション＋追いかけっこ的動き
  const onPawPress = (e) => {
    isHolding.current = true;
    addNyanki(1, e);

    // 縦ジャンプアニメーション
    Animated.sequence([
      Animated.timing(jumpAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(jumpAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // ランダムに少し位置を移動（追いかけっこ感）
    const randomX = (Math.random() - 0.5) * 100; // -50〜+50
    const randomY = (Math.random() - 0.5) * 100;

    Animated.spring(posX, {
      toValue: randomX,
      useNativeDriver: true,
    }).start();

    Animated.spring(posY, {
      toValue: randomY,
      useNativeDriver: true,
    }).start();
  };

  const onPawRelease = () => {
    isHolding.current = false;
  };

  if (!fontLoaded) return <Text>Loading fonts...</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={[styles.title, { fontFamily: 'Nikumaru' }]}>ネコクリッカー 🐾</Text>
      <Text style={[styles.counter, { fontFamily: 'Nikumaru' }]}>ネコパワー: {nyanki.toFixed(1)}</Text>
      <Text style={[styles.cpsText, { fontFamily: 'Nikumaru' }]}>毎秒のネコパワー: {totalCps.toFixed(1)}</Text>

      {/* Animated.Viewで包んで位置とジャンプを管理 */}
      <Animated.View
        style={{
          transform: [
            { translateX: posX },
            { translateY: Animated.add(posY, jumpAnim) },
          ],
        }}
      >
        <Pressable
          onPressIn={onPawPress}
          onPressOut={onPawRelease}
          style={styles.pawButton}
        >
          <Image source={catPawImg} style={styles.catPaw} />
        </Pressable>
      </Animated.View>

      {/* ハート */}
      {hearts.map(({ id, x, y, anim }) => (
        <Animated.Text
          key={id}
          pointerEvents="none"
          style={[styles.heart, {
            left: x - 10,
            top: y - 20,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }],
            fontFamily: 'Nikumaru',
          }]}
        >❤️ +1</Animated.Text>
      ))}

      {/* 猫たち（下レイヤー） */}
      {cats.map(({ id, x, y, size, upgradeId }) => {
        const upgrade = upgrades.find(u => u.id === upgradeId);
        if (!upgrade) return null;
        return (
          <Image
            key={id}
            source={upgrade.catImage}
            style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity: 0.7 }}
            resizeMode="contain"
            pointerEvents="none"
          />
        );
      })}

      {/* アップグレードエリア */}
      <View style={styles.upgradesContainer} pointerEvents="box-none">
        {upgrades.map(({ id, name }) => (
          <View key={id} style={styles.upgradeItem}>
            <Pressable
              onPress={() => buyUpgrade(id)}
              disabled={nyanki < upgradePrices[id]}
              style={({ pressed }) => [
                styles.button,
                nyanki < upgradePrices[id] ? styles.buttonDisabled : pressed ? styles.buttonPressed : styles.buttonEnabled,
              ]}
            >
              <Text
                selectable={false}
                style={[styles.buttonText, { fontFamily: 'Nikumaru' }]}
              >
                {name} ({upgradePrices[id]} ネコパワー)
              </Text>
            </Pressable>
            <Text style={[styles.ownedText, { fontFamily: 'Nikumaru' }]}>
              所持数: {autoUpgrades[id]}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfc',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  title: {
    fontSize: 30,
    marginBottom: 12,
  },
  counter: {
    fontSize: 24,
    marginBottom: 4,
  },
  cpsText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
  },
  pawButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPaw: {
    width: 100,
    height: 100,
  },
  heart: {
    position: 'absolute',
    fontSize: 20,
    color: 'red',
  },
  upgradesContainer: {
    position: 'absolute',
    bottom: 40,
    width: '90%',
  },
  upgradeItem: {
    marginVertical: 6,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ddd',
    borderColor: '#aaa',
  },
  buttonEnabled: {
    backgroundColor: '#f8e71c',
  },
  buttonPressed: {
    backgroundColor: '#d4c70a',
  },
  ownedText: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
});

