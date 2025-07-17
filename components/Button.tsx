import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  AccessibilityState
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
  // 🆕 可訪問性支持
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
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
  accessibilityLabel,
  accessibilityHint,
  testID,
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
  
  // 🆕 安全地構建文本樣式數組
  const buildTextStyles = (): (TextStyle | undefined)[] => {
    const baseStyles = getTextStyles();
    const styles: (TextStyle | undefined)[] = [...baseStyles];
    
    // 添加自定義文本樣式（如果存在）
    if (textStyle) {
      styles.push(textStyle);
    }
    
    // 添加圖標間距（如果存在圖標）
    if (icon) {
      styles.push({ marginLeft: 8 });
    }
    
    return styles;
  };
  
  // 🆕 構建可訪問性屬性
  const getAccessibilityProps = () => {
    const props: {
      accessibilityRole: AccessibilityRole;
      accessibilityState: AccessibilityState;
      accessibilityLabel?: string;
      accessibilityHint?: string;
    } = {
      accessibilityRole: "button",
      accessibilityState: {
        disabled: disabled || loading,
        busy: loading,
      },
    };
    
    if (accessibilityLabel) {
      props.accessibilityLabel = accessibilityLabel;
    } else {
      props.accessibilityLabel = title;
    }
    
    if (accessibilityHint) {
      props.accessibilityHint = accessibilityHint;
    }
    
    return props;
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
      {...getAccessibilityProps()}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === "primary" ? "#FFFFFF" : Colors.light.primary} 
        />
      ) : (
        <>
          {icon}
          <Text style={buildTextStyles()}>
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