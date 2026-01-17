import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { DatabaseModule } = NativeModules;

// Типы для тестов
interface Workflow {
  id: string;
  name: string;
  json: string;
  status: 'ENABLED' | 'DISABLED';
}

interface Run {
  id: string;
  workflowId: string;
  start: number;
  end?: number;
  status: 'RUNNING' | 'SUCCESS' | 'ERROR';
  log: string;
}

export default function Test() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState({ workflows: 0, runs: 0 });

  // Загрузка всех данных
  const refreshData = async () => {
    try {
      const wfs = await DatabaseModule.getAllWorkflows();
      const rs = await DatabaseModule.getAllRuns();
      const wCount = await DatabaseModule.getWorkflowCount();
      const rCount = await DatabaseModule.getRunCount();

      setWorkflows(wfs);
      setRuns(rs);
      setStats({ workflows: wCount, runs: rCount });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- ТЕСТОВЫЕ МЕТОДЫ ---

  const testUpsertWorkflow = async () => {
    const id = Math.random().toString(36).substring(7);
    await DatabaseModule.upsertWorkflow(
      id,
      `Workflow ${id}`,
      '{"action": "test"}',
      'ENABLED'
    );
    refreshData();
  };

  const testDeleteWorkflow = async (id: string) => {
    await DatabaseModule.deleteWorkflow(id);
    refreshData();
  };

  const testAddRun = async (workflowId: string) => {
    // Сначала создаем запуск (upsert как insert)
    const runId = await DatabaseModule.upsertRun(
      "", // пустой ID создаст новый UUID в Kotlin
      workflowId,
      'RUNNING',
      'Task started...',
      Date.now(),
      0 // end = null
    );
    
    Alert.alert("Success", `Run created with ID: ${runId}`);
    refreshData();

    // Симуляция обновления через 2 секунды (upsert как update)
    setTimeout(async () => {
      await DatabaseModule.upsertRun(
        runId,
        workflowId,
        'SUCCESS',
        'Task finished successfully!',
        0, // Kotlin сохранит старый start, если мы доработаем DAO, либо просто передайте тот же
        Date.now()
      );
      refreshData();
    }, 2000);
  };

  const testDeleteRun = async (id: string) => {
    await DatabaseModule.deleteRun(id);
    refreshData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AutoKit Storage Test</Text>
      
      <View style={styles.statsBar}>
        <Text>WFs: {stats.workflows}</Text>
        <Text>Runs: {stats.runs}</Text>
        <TouchableOpacity onPress={refreshData}><Text style={{color: 'blue'}}>Refresh</Text></TouchableOpacity>
      </View>

      <ScrollView>
        <TouchableOpacity style={styles.mainBtn} onPress={testUpsertWorkflow}>
          <Text style={styles.btnText}>+ Create New Workflow</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Workflows</Text>
        {workflows.map(wf => (
          <View key={wf.id} style={styles.card}>
            <Text style={styles.cardTitle}>{wf.name} ({wf.status})</Text>
            <Text style={styles.cardSub}>ID: {wf.id}</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => testAddRun(wf.id)} style={styles.actionBtn}>
                <Text>🚀 Run</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => testDeleteWorkflow(wf.id)} style={[styles.actionBtn, {backgroundColor: '#ffcccc'}]}>
                <Text>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent Runs (History)</Text>
        {runs.map(run => (
          <View key={run.id} style={[styles.card, {borderLeftWidth: 5, borderLeftColor: run.status === 'SUCCESS' ? 'green' : 'orange'}]}>
            <Text>Status: {run.status}</Text>
            <Text style={styles.cardSub}>Log: {run.log}</Text>
            <Text style={styles.cardSub}>Finished: {run.end ? new Date(run.end).toLocaleTimeString() : 'In Progress'}</Text>
            <TouchableOpacity onPress={() => testDeleteRun(run.id)}>
              <Text style={{color: 'red', marginTop: 5}}>Delete Log</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  mainBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardSub: { fontSize: 12, color: '#666' },
  row: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { padding: 8, borderRadius: 5, backgroundColor: '#eee', marginRight: 10 }
});
