import React from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  useWindowDimensions 
} from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";

interface OnboardingStepProps {
  title: string;
  description: string;
  imageUrl: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  onPrimaryButtonPress: () => void;
  onSecondaryButtonPress: () => void;
  hideContent?: boolean;
  hideButtons?: boolean;
}

export default function OnboardingStep({
  title,
  description,
  imageUrl,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryButtonPress,
  onSecondaryButtonPress,
  hideContent = false,
  hideButtons = false,
}: OnboardingStepProps) {
  const { width, height } = useWindowDimensions();
  
  return (
    <View style={[styles.container, { width }]}>
      {!hideContent && (
        <>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        </>
      )}
      
      {!hideButtons && (
        <View style={styles.buttonContainer}>
          <Button
            title={primaryButtonText}
            onPress={onPrimaryButtonPress}
            variant="primary"
            size="large"
            style={styles.primaryButton}
          />
          
          {secondaryButtonText && (
            <Button
              title={secondaryButtonText}
              onPress={onSecondaryButtonPress}
              variant="outline"
              size="medium"
              style={styles.secondaryButton}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: 100,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: Theme.radius.lg,
  },
  content: {
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: Theme.spacing.md,
  },
  description: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Theme.spacing.md,
  },
  buttonContainer: {
    gap: Theme.spacing.md,
  },
  primaryButton: {
    width: "100%",
  },
  secondaryButton: {
    width: "100%",
  },
});