// app/history.tsx
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Trash2, Play, AlertCircle } from "lucide-react-native";
import { useState, useEffect } from "react";
import { HistoryDB, WorkflowRun } from "@/lib/database";

interface HistoryCardProps {
  run: WorkflowRun;
  onDelete: (id: string) => void;
  onRunAgain: (workflowId: string) => Promise<void>;
}

const HistoryCard = ({ run, onDelete, onRunAgain }: HistoryCardProps) => {
  const [isRunning, setIsRunning] = useState(false);

  const formatDuration = () => {
    if (run.end === 0) return "Running...";
    
    const seconds = Math.floor((run.end - run.start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#22c55e';
      case 'ERROR': return '#ef4444';
      case 'RUNNING': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle color="#22c55e" size={16} />;
      case 'ERROR': return <XCircle color="#ef4444" size={16} />;
      case 'RUNNING': return <Clock color="#3b82f6" size={16} />;
      default: return <AlertCircle color="#6b7280" size={16} />;
    }
  };

  const showLog = () => {
    Alert.alert(
      `${run.workflowName || 'Workflow'} - ${run.status}`,
      run.log,
      [{ text: "Close" }],
      { userInterfaceStyle: 'dark' }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete History Record",
      "Are you sure you want to delete this history record?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(run.id) }
      ]
    );
  };

  const handleRunAgain = async () => {
    setIsRunning(true);
    try {
      await onRunAgain(run.workflowId);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View className="bg-google-card mb-4 p-4 rounded-2xl">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-google text-lg mb-1">
            {run.workflowName || `Workflow ${run.workflowId.slice(0, 8)}`}
          </Text>
          <Text className="text-gray-400 font-google text-xs">
            ID: {run.id.slice(0, 8)}... • Started: {formatDate(run.start)}
          </Text>
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
      
      <View className="mb-3">
        <Text className="text-gray-500 font-google text-xs">
          Duration: {formatDuration()}
        </Text>
      </View>
      
      <View className="flex-row justify-between items-center">
        <View className="flex-row">
          <TouchableOpacity 
            className="flex-row items-center bg-blue-500/20 px-3 py-2 rounded-xl mr-2"
            onPress={showLog}
          >
            <FileText color="#8ab4f8" size={14} />
            <Text className="text-blue-400 font-google text-xs ml-1">View Log</Text>
          </TouchableOpacity>
          
          {run.status !== 'RUNNING' && (
            <TouchableOpacity 
              className="flex-row items-center bg-green-500/20 px-3 py-2 rounded-xl"
              onPress={handleRunAgain}
              disabled={isRunning}
            >
              {isRunning ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <>
                  <Play color="#22c55e" size={14} />
                  <Text className="text-green-400 font-google text-xs ml-1">Run Again</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          className="w-10 h-10 bg-red-500/20 rounded-xl items-center justify-center"
          onPress={handleDelete}
        >
          <Trash2 color="#ef4444" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function History() {
  const router = useRouter();
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      setRefreshing(true);
      const data = await HistoryDB.getAll();
      // Сортируем по времени (новые сверху)
      const sortedData = data.sort((a, b) => b.start - a.start);
      setHistoryRuns(sortedData);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert("Error", "Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      await HistoryDB.delete(id);
      await loadHistory();
    } catch (error) {
      console.error('Error deleting history record:', error);
      Alert.alert("Error", "Failed to delete history record");
    }
  };

  const runWorkflowAgain = async (workflowId: string) => {
    try {
      // Создаем новую запись запуска
      const runId = await HistoryDB.add(
        workflowId,
        'RUNNING',
        `Re-running workflow from history\nTimestamp: ${new Date().toISOString()}`
      );

      // Имитация выполнения
      setTimeout(async () => {
        try {
          const success = Math.random() > 0.2; // 80% успеха для демо
          const status = success ? 'SUCCESS' : 'ERROR';
          const log = success 
            ? `Workflow re-run completed successfully\nExecution time: 1.8s\nResults: Re-executed from history`
            : `Workflow re-run failed\nError: Connection timeout\nRetry attempt: 1/2`;

          await HistoryDB.updateRunStatus(runId, status, log);
        } catch (error) {
          console.error('Error updating run status:', error);
        }
      }, 1800);

      Alert.alert(
        "Workflow Started",
        "Workflow is now running. Check history for results.",
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error('Error running workflow again:', error);
      Alert.alert("Error", "Failed to start workflow");
    }
  };

  const clearAllHistory = () => {
    if (historyRuns.length === 0) return;
    
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
        {/* Заголовок */}
        <View className="flex-row items-center justify-between mb-6 mt-4">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mr-4"
            >
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text className="text-white font-google text-xl">History</Text>
          </View>
          
          {historyRuns.length > 0 && !loading && (
            <TouchableOpacity 
              className="flex-row items-center bg-red-500/20 px-3 py-2 rounded-xl"
              onPress={clearAllHistory}
            >
              <Trash2 color="#ef4444" size={16} />
              <Text className="text-red-400 font-google text-sm ml-1">Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Статистика */}
        {!loading && historyRuns.length > 0 && (
          <View className="mb-4 p-3 bg-google-card rounded-xl">
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-white font-google text-lg">
                  {historyRuns.length}
                </Text>
                <Text className="text-gray-400 font-google text-xs">Total Runs</Text>
              </View>
              <View className="items-center">
                <Text className="text-green-400 font-google text-lg">
                  {historyRuns.filter(r => r.status === 'SUCCESS').length}
                </Text>
                <Text className="text-gray-400 font-google text-xs">Successful</Text>
              </View>
              <View className="items-center">
                <Text className="text-red-400 font-google text-lg">
                  {historyRuns.filter(r => r.status === 'ERROR').length}
                </Text>
                <Text className="text-gray-400 font-google text-xs">Failed</Text>
              </View>
              <View className="items-center">
                <Text className="text-blue-400 font-google text-lg">
                  {historyRuns.filter(r => r.status === 'RUNNING').length}
                </Text>
                <Text className="text-gray-400 font-google text-xs">Running</Text>
              </View>
            </View>
          </View>
        )}

        {/* Содержимое */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8ab4f8" />
            <Text className="text-gray-400 font-google text-base mt-4">
              Loading history...
            </Text>
          </View>
        ) : (
          <>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              className="flex-1"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={loadHistory}
                  tintColor="#8ab4f8"
                  colors={["#8ab4f8"]}
                />
              }
            >
              {historyRuns.map((run) => (
                <HistoryCard
                  key={run.id}
                  run={run}
                  onDelete={deleteHistoryRecord}
                  onRunAgain={runWorkflowAgain}
                />
              ))}
              
              {historyRuns.length === 0 && (
                <View className="flex-1 items-center justify-center mt-20">
                  <FileText color="#6b7280" size={64} />
                  <Text className="text-gray-400 font-google text-lg mt-4 mb-2">
                    No History Yet
                  </Text>
                  <Text className="text-gray-500 font-google text-sm text-center px-8 mb-6">
                    Run workflows from the Workflows tab to see execution history here.
                  </Text>
                  <TouchableOpacity 
                    className="flex-row items-center bg-blue-500/20 px-4 py-3 rounded-xl"
                    onPress={() => router.push('/workflows')}
                  >
                    <Play color="#8ab4f8" size={16} />
                    <Text className="text-blue-400 font-google text-sm ml-2">
                      Go to Workflows
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            
            {/* Кнопка обновления внизу */}
            {historyRuns.length > 0 && (
              <TouchableOpacity
                className="flex-row items-center justify-center bg-google-card py-3 rounded-xl mt-4 mb-2"
                onPress={loadHistory}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#8ab4f8" />
                ) : (
                  <>
                    <Clock color="#8ab4f8" size={16} />
                    <Text className="text-blue-400 font-google text-sm ml-2">
                      Refresh History
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// Добавляем RefreshControl импорт
import { RefreshControl } from "react-native";