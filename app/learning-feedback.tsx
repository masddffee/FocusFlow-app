import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { 
  X, 
  Save, 
  Share2, 
  Brain, 
  Clock, 
  CheckCircle, 
  Edit3,
  TrendingUp,
  Award
} from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { useTimerStore } from "@/store/timerStore";
import { useTaskStore } from "@/store/taskStore";
import { useStatsStore } from "@/store/statsStore";
import { compileMarkdownNotes } from "@/utils/ai";
import { generateLearningQuestionsSafely } from "@/utils/api";
import { useSettingsStore } from "@/store/settingsStore";

interface LearningSession {
  taskId: string;
  taskTitle: string;
  duration: number;
  completedAt: string;
}

export default function LearningFeedbackScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [markdownNotes, setMarkdownNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [session, setSession] = useState<LearningSession | null>(null);
  
  const { lastSession, clearLastSession } = useTimerStore();
  const { tasks } = useTaskStore();
  const { addLearningSession } = useStatsStore();

  useEffect(() => {
    // Get session data from timer store or params
    if (lastSession) {
      const task = tasks.find(t => t.id === lastSession.taskId);
      setSession({
        taskId: lastSession.taskId,
        taskTitle: task?.title || "Focus Session",
        duration: lastSession.duration,
        completedAt: new Date().toISOString(),
      });
    } else if (sessionId) {
      // Handle case where session is passed via params
      const task = tasks.find(t => t.id === sessionId);
      if (task) {
        setSession({
          taskId: sessionId,
          taskTitle: task.title,
          duration: 25 * 60, // Default 25 minutes if no duration available
          completedAt: new Date().toISOString(),
        });
      }
    }
  }, [lastSession, sessionId, tasks]);

  const handleGenerateQuestions = async () => {
    if (!summary.trim()) {
      Alert.alert("Missing Summary", "Please write a summary of what you learned first.");
      return;
    }

    setIsGeneratingQuestions(true);
    
    try {
      // 🔐 使用安全的學習問題生成
      const currentLanguage = useSettingsStore.getState().language;
      const questionsResponse = await generateLearningQuestionsSafely(summary, currentLanguage);
      
      if (questionsResponse.questions && questionsResponse.questions.length > 0) {
        setQuestions(questionsResponse.questions);
      
      // Initialize answers object
      const initialAnswers: Record<string, string> = {};
        questionsResponse.questions.forEach((_, index) => {
        initialAnswers[index.toString()] = "";
      });
      setAnswers(initialAnswers);
      
        if (questionsResponse.fallback) {
          Alert.alert(
            "Questions Generated",
            `Generated ${questionsResponse.questions.length} review questions using fallback method due to network issues.`
          );
        } else {
      Alert.alert(
        "Questions Generated",
            `Generated ${questionsResponse.questions.length} review questions to help reinforce your learning.`
      );
        }
      } else {
        Alert.alert("Error", "No questions could be generated. Please try a more detailed summary.");
      }
      
    } catch (error) {
      console.error("Error generating questions:", error);
      Alert.alert("Error", "Failed to generate questions. Please try again later.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!session) {
      Alert.alert("Error", "Session information not found.");
      return;
    }

    if (!summary.trim()) {
      Alert.alert("Missing Summary", "Please write a summary before saving.");
      return;
    }

    setIsSaving(true);

    try {
      // Compile Q&A pairs
      const qaList = questions.map((question, index) => ({
        question,
        answer: answers[index.toString()] || "No answer provided"
      }));

      // Generate markdown notes
      const markdown = compileMarkdownNotes(
        session.taskTitle,
        summary,
        qaList,
        session.duration
      );

      setMarkdownNotes(markdown);
      setShowNotes(true);

      // Save learning session to stats
      addLearningSession({
        id: `session_${Date.now()}`,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        duration: session.duration,
        summary,
        questions: qaList,
        completedAt: session.completedAt,
        notes: markdown,
      });

      Alert.alert(
        "Notes Saved",
        "Your learning notes have been saved successfully!"
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareNotes = async () => {
    if (!markdownNotes) {
      Alert.alert("No Notes", "Please save your notes first before sharing.");
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Share.share({
          message: markdownNotes,
          title: `Learning Notes: ${session?.taskTitle}`,
        });
      } else {
        // Web fallback - copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(markdownNotes);
          Alert.alert("Copied", "Notes copied to clipboard!");
        } else {
          Alert.alert("Error", "Clipboard not available on this browser.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share notes.");
    }
  };

  const handleFinish = () => {
    // Clear the last session from timer store
    clearLastSession();
    
    // Navigate to stats or home
    Alert.alert(
      "Great job on your learning!",
      "Take a break and review your progress in the Statistics section.",
      [
        { text: "View Stats", onPress: () => router.push("/(tabs)/stats") },
        { text: "Go Home", onPress: () => router.push("/(tabs)") },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Learning Feedback",
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  if (showNotes) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Learning Notes",
            headerLeft: () => (
              <TouchableOpacity onPress={() => setShowNotes(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity onPress={handleShareNotes}>
                <Share2 size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              value={markdownNotes}
              onChangeText={setMarkdownNotes}
              multiline
              textAlignVertical="top"
              placeholder="Your learning notes will appear here..."
              placeholderTextColor={Colors.light.subtext}
            />
          </View>
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Finish Session"
            onPress={handleFinish}
            variant="primary"
            size="large"
            icon={<Award size={20} color="#FFFFFF" />}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Learning Feedback",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Session Summary */}
        <View style={styles.sessionSummary}>
          <View style={styles.sessionHeader}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.sessionTitle}>Great job completing your focus session!</Text>
          </View>
          
          <View style={styles.sessionDetails}>
            <View style={styles.sessionDetail}>
              <Text style={styles.sessionDetailLabel}>Task</Text>
              <Text style={styles.sessionDetailValue}>{session.taskTitle}</Text>
            </View>
            
            <View style={styles.sessionDetail}>
              <Clock size={16} color={Colors.light.subtext} />
              <Text style={styles.sessionDetailValue}>{formatDuration(session.duration)}</Text>
            </View>
          </View>
        </View>

        {/* Learning Summary Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>What did you learn? (Summary)</Text>
          <TextInput
            style={styles.summaryInput}
            value={summary}
            onChangeText={setSummary}
            placeholder="Write a summary of what you learned or accomplished..."
            placeholderTextColor={Colors.light.subtext}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Generate Questions Button */}
        <View style={styles.inputGroup}>
          <Button
            title="Generate Review Questions"
            onPress={handleGenerateQuestions}
            variant="outline"
            loading={isGeneratingQuestions}
            icon={<Brain size={20} color={Colors.light.primary} />}
            disabled={!summary.trim()}
          />
        </View>

        {/* Generated Questions */}
        {questions.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Review Questions</Text>
            <Text style={styles.questionsSubtitle}>
              Answer these questions to reinforce your learning:
            </Text>
            
            {questions.map((question, index) => (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {index + 1}. {question}
                </Text>
                <TextInput
                  style={styles.answerInput}
                  value={answers[index.toString()] || ""}
                  onChangeText={(text) => setAnswers(prev => ({
                    ...prev,
                    [index.toString()]: text
                  }))}
                  placeholder="Your answer..."
                  placeholderTextColor={Colors.light.subtext}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Save Notes"
          onPress={handleSaveNotes}
          variant="primary"
          size="large"
          loading={isSaving}
          icon={<Save size={20} color="#FFFFFF" />}
          disabled={!summary.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.lg,
  },
  errorText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.error,
    marginBottom: Theme.spacing.lg,
    textAlign: "center",
  },
  sessionSummary: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.success,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  sessionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  sessionDetails: {
    gap: Theme.spacing.sm,
  },
  sessionDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.xs,
  },
  sessionDetailLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    fontWeight: "500",
  },
  sessionDetailValue: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  summaryInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    minHeight: 120,
    textAlignVertical: "top",
  },
  questionsSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.md,
    lineHeight: 20,
  },
  questionContainer: {
    marginBottom: Theme.spacing.lg,
  },
  questionText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
    lineHeight: 22,
    fontWeight: "500",
  },
  answerInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    minHeight: 80,
    textAlignVertical: "top",
  },
  notesContainer: {
    flex: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    minHeight: 400,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  buttonContainer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: "#FFFFFF",
  },
});