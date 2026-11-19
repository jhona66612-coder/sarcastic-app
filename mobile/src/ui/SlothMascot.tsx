import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Platform, View } from "react-native";

export function SlothMascot({ size = 130, state = "idle" }: {
  size?: number; state?: "idle" | "listening" | "thinking" | "speaking";
}) {
  const [motion] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(false);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (reduced) { motion.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: state === "thinking" ? 650 : 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(motion, { toValue: 0, duration: state === "thinking" ? 650 : 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web" }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion, reduced, state]);
  useEffect(() => {
    if (reduced) return;
    let blink: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      if (state === "speaking") setFrame(value => value === 2 ? 0 : 2);
      else { setFrame(1); blink = setTimeout(() => setFrame(0), 150); }
    }, state === "speaking" ? 230 : 3700);
    return () => { clearInterval(interval); clearTimeout(blink); setFrame(0); };
  }, [state, reduced]);
  return <View accessible={false} style={{ width: size, height: size }}>
    <Animated.View style={{ width: size, height: size, overflow: "hidden", transform: [
      { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
      { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: [state === "thinking" ? "-4deg" : "-1deg", state === "thinking" ? "4deg" : "1deg"] }) },
    ] }}>
      <Image source={require("../../assets/mascot/slothbot-sprites.png")} resizeMode="stretch"
        style={{ width: size * 3, height: size, position: "absolute", left: -(reduced ? 0 : frame) * size }} />
    </Animated.View>
  </View>;
}
