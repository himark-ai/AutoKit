import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Trash2 } from "lucide-react-native";
import { useState, useEffect } from "react";
import { HistoryDB, WorkflowRun } from "@/lib/database";

interface HistoryCardProps {
  run: WorkflowRun;
  onDelete: (id: string) => void;
}

const HistoryCard = ({ run, onDelete }: HistoryCardProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded': return '#22c55e';
      case 'Error': return '#ef4444';
      case 'Running': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded': return <CheckCircle color="#22c55e" size={16} />;
      case 'Error': return <XCircle color="#ef4444" size={16} />;
      case 'Running': return <Clock color="#3b82f6" size={16} />;
      default: return <Clock color="#6b7280" size={16} />;
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete History Record",
      `Are you sure you want to delete this history record?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(run.id) }
      ]
    );
  };

  const showLog = () => {
    Alert.alert(
      `Log - ${run.workflowName}`,
      run.log.join('\n'),
      [{ text: "Close" }],
      { userInterfaceStyle: 'dark' }
    );
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={showLog}
      className="bg-google-card mb-4 p-4 rounded-2xl"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-google text-lg mb-1">{run.workflowName}</Text>
          <Text className="text-gray-400 font-google text-sm">Run ID: {run.id}</Text>
        </View>
        
        <View className="flex-row items-center">
          {getStatusIcon(run.status)}
          <Text 
            className="font-google text-sm ml-2"
            style={{ color: getStatusColor(run.status) }}
          >
            {run.status}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Clock color="#6b7280" size={14} />
          <Text className="text-gray-500 font-google text-xs ml-1">
            {formatDate(run.startTime)}
          </Text>
        </View>
        
        <Text className="text-gray-500 font-google text-xs">
          Duration: {formatDuration(run.duration)}
        </Text>
      </View>
      
      <View className="flex-row justify-between items-center">
        <TouchableOpacity 
          className="flex-row items-center bg-blue-500/20 px-3 py-2 rounded-xl"
          onPress={showLog}
        >
          <FileText color="#8ab4f8" size={14} />
          <Text className="text-blue-400 font-google text-xs ml-1">View Log</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
          onPress={handleDelete}
        >
          <Trash2 color="#ef4444" size={16} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function History() {
  const router = useRouter();
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка history из БД
  const loadHistory = async () => {
    try {
      setLoading(true);
      await HistoryDB.forceInit(); // Принудительное обновление данных
      const data = await HistoryDB.getAll();
      setHistoryRuns(data);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert("Error", "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  // Добавление тестовой записи history
  const addTestHistory = async () => {
    try {
      const newHistoryRecord = {
        workflowName: `Test Workflow ${historyRuns.length + 1}`,
        status: Math.random() > 0.5 ? 'Succeeded' : 'Error',
        startTime: new Date().toISOString(),
        duration: Math.floor(Math.random() * 300), // до 5 минут
        log: [
          `Starting workflow execution...`,
          `Processing step 1...`,
          `Processing step 2...`,
          `Workflow ${Math.random() > 0.5 ? 'completed successfully' : 'failed with error'}`
        ]
      };
      
      await HistoryDB.add(newHistoryRecord);
      await loadHistory(); // Перезагружаем список
    } catch (error) {
      console.error('Error adding history record:', error);
      Alert.alert("Error", "Failed to add history record");
    }
  };

  // Удаление записи history
  const deleteHistoryRecord = async (id: string) => {
    try {
      await HistoryDB.delete(id);
      await loadHistory(); // Перезагружаем список
    } catch (error) {
      console.error('Error deleting history record:', error);
      Alert.alert("Error", "Failed to delete history record");
    }
  };

  // Очистка всей истории
  const clearAllHistory = () => {
    Alert.alert(
      "Clear All History",
      "Are you sure you want to delete all history records?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            try {
              await HistoryDB.clearAll();
              await loadHistory();
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert("Error", "Failed to clear history");
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#131314" }}>
      <View className="flex-1 bg-google-bg px-6">
        <View className="flex-row items-center justify-between mb-6 mt-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-google text-xl">History</Text>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity 
              className="w-10 h-10 bg-green-500/20 rounded-xl items-center justify-center mr-2"
              onPress={addTestHistory}
            >
              <FileText color="#22c55e" size={20} />
            </TouchableOpacity>
            
            {historyRuns.length > 0 && (
              <TouchableOpacity 
                className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
                onPress={clearAllHistory}
              >
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400 font-google text-base">Loading history...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {historyRuns.map((run) => (
              <HistoryCard
                key={run.id}
                run={run}
                onDelete={deleteHistoryRecord}
              />
            ))}
            
            {historyRuns.length === 0 && (
              <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-gray-400 font-google text-base mb-4">No history records found</Text>
                <TouchableOpacity 
                  className="bg-blue-500/20 px-6 py-3 rounded-xl"
                  onPress={addTestHistory}
                >
                  <Text className="text-blue-400 font-google text-base">Add Test History</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}