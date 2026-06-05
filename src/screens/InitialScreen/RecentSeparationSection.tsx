import { FlatList, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SeparationJob } from "../../models/separations-jobs/SeparationJob";
import { deleteSeparation } from "../../services/separationService";

type Props = {
    jobs: SeparationJob[];
    onRefresh?: () => void;
}

export default function RecentSeparationSection({ jobs, onRefresh }: Props) {
  const handleDelete = async (id: string) => {
    try {
      await deleteSeparation(id);
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting separation:", error);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No recent separations</Text>
    </View>
  );

  return(
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Recent separations</Text>
      </View>
      <FlatList 
      data={jobs}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({item}) => {
        const finished = item.finishedAt ? new Date(item.finishedAt).toDateString() : '-';
        return (
          <View style={styles.item}>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{finished} • {String(item.option)}</Text>
            </View>
            <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)} >
              <Text style={styles.deleteText}>x</Text>
            </TouchableOpacity>
          </View>
        );
      }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingLeft: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    letterSpacing: 0.2,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: "gray",
  },
  deleteArea: {
    paddingTop: 13,
    paddingRight: 15,
  },
  deleteText: {
    color: "#ff4d4d",
    fontWeight: "bold",
  },
  container: {
    marginTop: 20,
    width: '95%',
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
});