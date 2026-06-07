import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllSeparations } from '../../services/clientService';
import { getClientId } from '../../utils/clientStorage';
import { SeparationJob } from '../../models/separations-jobs/SeparationJob';
import { deleteSeparationById } from '../../utils/separationStorage';

export default function AllSeparationsScreen() {
  const [jobs, setJobs] = useState<SeparationJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const clientId = await getClientId();
      if (!clientId) {
        setJobs([]);
        return;
      }

      const data = await getAllSeparations(clientId);
      const sortedData = data.sort(
        (d1, d2) => new Date(d2.finishedAt).getTime() - new Date(d1.finishedAt).getTime()
      );
      setJobs(sortedData);
    } catch (error) {
      console.error('Greška pri dohvaćanju svih separacija:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSeparationById(id);
    await fetchJobs();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No separations yet</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All separations</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.listContent}
          renderItem={({ item }) => {
            const finished = item.finishedAt ? new Date(item.finishedAt).toDateString() : '-';
            return (
              <TouchableOpacity 
                style={styles.item}
                onPress={() => console.log(item.id)}
              >
                <View style={styles.info}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{finished} • {String(item.option)}</Text>
                </View>
                <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>x</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  info: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  meta: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4,
  },
  deleteArea: {
    paddingTop: 13,
    paddingRight: 15,
    paddingLeft: 12,
  },
  deleteText: {
    color: '#ff4d4d',
    fontWeight: 'bold',
  },
});
