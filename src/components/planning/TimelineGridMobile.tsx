import React from 'react'
import { View, StyleSheet } from 'react-native'
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { StopCardCompact } from './StopCardCompact'

interface Props {
  planId: string
}

export default function TimelineGridMobile({ planId }: Props) {
  const { stops, reorder } = useCollaborativeState({ planId })

  /** ↓ helper turns Draggable data array into id list */
  const handleDragEnd = ({ data }: { data: typeof stops }) => {
    reorder(data.map((s) => s.id))
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <StopCardCompact
      stop={item}
      onLongPress={drag}
      active={isActive}
      draggable
    />
  )

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={stops}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})