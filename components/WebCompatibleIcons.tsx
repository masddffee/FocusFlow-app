import React from 'react';
import { Platform } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';

// Import Lucide React Native icons with conditional loading
let LucideIcons: any;
if (Platform.OS !== 'web') {
  LucideIcons = require('lucide-react-native');
} else {
  // Web fallback - use simple SVG or text representations
  LucideIcons = {
    Home: () => <Text style={styles.iconText}>🏠</Text>,
    ListTodo: () => <Text style={styles.iconText}>📝</Text>,
    BarChart2: () => <Text style={styles.iconText}>📊</Text>,
    User: () => <Text style={styles.iconText}>👤</Text>,
    Plus: () => <Text style={styles.iconText}>➕</Text>,
    Calendar: () => <Text style={styles.iconText}>📅</Text>,
    Clock: () => <Text style={styles.iconText}>⏰</Text>,
    ChevronRight: () => <Text style={styles.iconText}>›</Text>,
    ChevronLeft: () => <Text style={styles.iconText}>‹</Text>,
    Settings: () => <Text style={styles.iconText}>⚙️</Text>,
    Play: () => <Text style={styles.iconText}>▶️</Text>,
    Pause: () => <Text style={styles.iconText}>⏸️</Text>,
    Stop: () => <Text style={styles.iconText}>⏹️</Text>,
    RotateCcw: () => <Text style={styles.iconText}>🔄</Text>,
    Check: () => <Text style={styles.iconText}>✅</Text>,
    X: () => <Text style={styles.iconText}>❌</Text>,
    Edit: () => <Text style={styles.iconText}>✏️</Text>,
    Trash: () => <Text style={styles.iconText}>🗑️</Text>,
    Search: () => <Text style={styles.iconText}>🔍</Text>,
    Filter: () => <Text style={styles.iconText}>🔽</Text>,
    Menu: () => <Text style={styles.iconText}>☰</Text>,
    Bell: () => <Text style={styles.iconText}>🔔</Text>,
    Moon: () => <Text style={styles.iconText}>🌙</Text>,
    Sun: () => <Text style={styles.iconText}>☀️</Text>,
    Globe: () => <Text style={styles.iconText}>🌐</Text>,
    Download: () => <Text style={styles.iconText}>⬇️</Text>,
    Upload: () => <Text style={styles.iconText}>⬆️</Text>,
    Refresh: () => <Text style={styles.iconText}>🔄</Text>,
    Info: () => <Text style={styles.iconText}>ℹ️</Text>,
    AlertCircle: () => <Text style={styles.iconText}>⚠️</Text>,
    CheckCircle: () => <Text style={styles.iconText}>✅</Text>,
    XCircle: () => <Text style={styles.iconText}>❌</Text>,
  };
}

// Component wrapper to handle props
const IconWrapper = ({ IconComponent, size = 24, color = '#000000', ...props }: any) => {
  if (Platform.OS !== 'web') {
    return <IconComponent size={size} color={color} {...props} />;
  } else {
    return (
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        <IconComponent />
      </View>
    );
  }
};

// Export commonly used icons
export const Home = (props: any) => <IconWrapper IconComponent={LucideIcons.Home} {...props} />;
export const ListTodo = (props: any) => <IconWrapper IconComponent={LucideIcons.ListTodo} {...props} />;
export const BarChart2 = (props: any) => <IconWrapper IconComponent={LucideIcons.BarChart2} {...props} />;
export const User = (props: any) => <IconWrapper IconComponent={LucideIcons.User} {...props} />;
export const Plus = (props: any) => <IconWrapper IconComponent={LucideIcons.Plus} {...props} />;
export const Calendar = (props: any) => <IconWrapper IconComponent={LucideIcons.Calendar} {...props} />;
export const Clock = (props: any) => <IconWrapper IconComponent={LucideIcons.Clock} {...props} />;
export const ChevronRight = (props: any) => <IconWrapper IconComponent={LucideIcons.ChevronRight} {...props} />;
export const ChevronLeft = (props: any) => <IconWrapper IconComponent={LucideIcons.ChevronLeft} {...props} />;
export const Settings = (props: any) => <IconWrapper IconComponent={LucideIcons.Settings} {...props} />;
export const Play = (props: any) => <IconWrapper IconComponent={LucideIcons.Play} {...props} />;
export const Pause = (props: any) => <IconWrapper IconComponent={LucideIcons.Pause} {...props} />;
export const Stop = (props: any) => <IconWrapper IconComponent={LucideIcons.Stop} {...props} />;
export const RotateCcw = (props: any) => <IconWrapper IconComponent={LucideIcons.RotateCcw} {...props} />;
export const Check = (props: any) => <IconWrapper IconComponent={LucideIcons.Check} {...props} />;
export const X = (props: any) => <IconWrapper IconComponent={LucideIcons.X} {...props} />;
export const Edit = (props: any) => <IconWrapper IconComponent={LucideIcons.Edit} {...props} />;
export const Trash = (props: any) => <IconWrapper IconComponent={LucideIcons.Trash} {...props} />;
export const Search = (props: any) => <IconWrapper IconComponent={LucideIcons.Search} {...props} />;
export const Filter = (props: any) => <IconWrapper IconComponent={LucideIcons.Filter} {...props} />;
export const Menu = (props: any) => <IconWrapper IconComponent={LucideIcons.Menu} {...props} />;
export const Bell = (props: any) => <IconWrapper IconComponent={LucideIcons.Bell} {...props} />;
export const Moon = (props: any) => <IconWrapper IconComponent={LucideIcons.Moon} {...props} />;
export const Sun = (props: any) => <IconWrapper IconComponent={LucideIcons.Sun} {...props} />;
export const Globe = (props: any) => <IconWrapper IconComponent={LucideIcons.Globe} {...props} />;
export const Download = (props: any) => <IconWrapper IconComponent={LucideIcons.Download} {...props} />;
export const Upload = (props: any) => <IconWrapper IconComponent={LucideIcons.Upload} {...props} />;
export const Refresh = (props: any) => <IconWrapper IconComponent={LucideIcons.Refresh} {...props} />;
export const Info = (props: any) => <IconWrapper IconComponent={LucideIcons.Info} {...props} />;
export const AlertCircle = (props: any) => <IconWrapper IconComponent={LucideIcons.AlertCircle} {...props} />;
export const CheckCircle = (props: any) => <IconWrapper IconComponent={LucideIcons.CheckCircle} {...props} />;
export const XCircle = (props: any) => <IconWrapper IconComponent={LucideIcons.XCircle} {...props} />;

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default {
  Home,
  ListTodo,
  BarChart2,
  User,
  Plus,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Settings,
  Play,
  Pause,
  Stop,
  RotateCcw,
  Check,
  X,
  Edit,
  Trash,
  Search,
  Filter,
  Menu,
  Bell,
  Moon,
  Sun,
  Globe,
  Download,
  Upload,
  Refresh,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
};