import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type LatLng, type MapPressEvent } from "react-native-maps";
import { radius } from "../../../theme/colors";

const DEFAULT_REGION = {
  latitude: 24.7136, // Riyadh — reasonable default center for Saudi users
  longitude: 46.6753,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

interface MeetupMapPickerProps {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
}

export function MeetupMapPicker({ value, onChange }: MeetupMapPickerProps) {
  const [region] = useState(value ? { ...value, latitudeDelta: 0.05, longitudeDelta: 0.05 } : DEFAULT_REGION);

  function handlePress(event: MapPressEvent) {
    onChange(event.nativeEvent.coordinate);
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} onPress={handlePress}>
        {value && <Marker coordinate={value} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate)} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 260, borderRadius: radius.md, overflow: "hidden" },
  map: { flex: 1 },
});
