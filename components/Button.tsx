import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle 
} from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const getButtonStyles = (): ViewStyle[] => {
    const styles: ViewStyle[] = [buttonStyles.button];
    
    // Size styles
    switch (size) {
      case "small":
        styles.push(buttonStyles.small);
        break;
      case "large":
        styles.push(buttonStyles.large);
        break;
      default:
        styles.push(buttonStyles.medium);
    }
    
    // Variant styles
    switch (variant) {
      case "secondary":
        styles.push(buttonStyles.secondary);
        break;
      case "outline":
        styles.push(buttonStyles.outline);
        break;
      default:
        styles.push(buttonStyles.primary);
    }
    
    // State styles
    if (disabled || loading) {
      styles.push(buttonStyles.disabled);
    }
    
    return styles;
  };
  
  const getTextStyles = (): TextStyle[] => {
    const styles: TextStyle[] = [buttonStyles.text];
    
    // Size styles
    switch (size) {
      case "small":
        styles.push(buttonStyles.smallText);
        break;
      case "large":
        styles.push(buttonStyles.largeText);
        break;
      default:
        styles.push(buttonStyles.mediumText);
    }
    
    // Variant styles
    switch (variant) {
      case "secondary":
        styles.push(buttonStyles.secondaryText);
        break;
      case "outline":
        styles.push(buttonStyles.outlineText);
        break;
      default:
        styles.push(buttonStyles.primaryText);
    }
    
    return styles;
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === "primary" ? "#FFFFFF" : Colors.light.primary} 
        />
      ) : (
        <>
          {icon}
          <Text style={[...getTextStyles(), textStyle, icon && { marginLeft: 8 }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  
  // Size styles
  small: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  medium: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  large: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  
  // Variant styles
  primary: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  secondary: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.border,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: Colors.light.primary,
  },
  
  // State styles
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  smallText: {
    fontSize: Theme.typography.sizes.sm,
  },
  mediumText: {
    fontSize: Theme.typography.sizes.md,
  },
  largeText: {
    fontSize: Theme.typography.sizes.lg,
  },
  primaryText: {
    color: "#FFFFFF",
  },
  secondaryText: {
    color: Colors.light.text,
  },
  outlineText: {
    color: Colors.light.primary,
  },
});