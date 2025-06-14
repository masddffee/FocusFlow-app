import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    target: number;
  }[];
  title?: string;
}

export default function ProgressChart({ data, title }: ProgressChartProps) {
  const maxValue = Math.max(...data.map(item => Math.max(item.value, item.target)));
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
            
            <View style={styles.barContainer}>
              <View style={styles.targetBar} />
              <View 
                style={[
                  styles.valueBar, 
                  { 
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.value >= item.target 
                      ? Colors.light.success 
                      : Colors.light.primary
                  }
                ]} 
              />
              <View 
                style={[
                  styles.targetIndicator,
                  { left: `${(item.target / maxValue) * 100}%` }
                ]}
              />
            </View>
            
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>
                {item.value}/{item.target}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  chartContainer: {
    width: "100%",
  },
  barGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  labelContainer: {
    width: 80,
    marginRight: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: Theme.radius.round,
    overflow: "hidden",
    position: "relative",
  },
  targetBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F1F5F9",
  },
  valueBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.light.primary,
    borderRadius: Theme.radius.round,
  },
  targetIndicator: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 18,
    backgroundColor: Colors.light.text,
  },
  valueContainer: {
    width: 60,
    marginLeft: Theme.spacing.md,
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.text,
    fontWeight: "500",
  },
});