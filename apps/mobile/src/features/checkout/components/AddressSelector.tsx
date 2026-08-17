import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { TextField } from "../../../components/TextField";
import { CitySelectField } from "../../../components/CitySelectField";
import { Button } from "../../../components/Button";
import * as addressesApi from "../../../api/addresses";
import type { City } from "../../../api/regions";
import { colors, radius, spacing } from "../../../theme/colors";

interface AddressSelectorProps {
  value: addressesApi.Address | null;
  onChange: (address: addressesApi.Address) => void;
}

export function AddressSelector({ value, onChange }: AddressSelectorProps) {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<addressesApi.Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    addressesApi.getAddresses().then((list) => {
      setAddresses(list);
      if (list.length === 0) setShowForm(true);
    });
  }, []);

  async function handleSave() {
    if (!label.trim() || !city || !district.trim() || !street.trim()) return;
    setSaving(true);
    try {
      const address = await addressesApi.createAddress({ label: label.trim(), cityId: city.id, district: district.trim(), street: street.trim() });
      setAddresses((prev) => [address, ...prev]);
      onChange(address);
      setShowForm(false);
      setLabel("");
      setDistrict("");
      setStreet("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      {addresses.length > 0 && (
        <View style={styles.list}>
          {addresses.map((address) => (
            <Pressable
              key={address.id}
              style={[styles.addressRow, value?.id === address.id && styles.addressRowActive]}
              onPress={() => onChange(address)}
            >
              <Text style={styles.addressLabel}>{address.label}</Text>
              <Text style={styles.addressDetail}>
                {address.street}, {address.district}, {address.city.nameEn}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!showForm && <Button label={t("checkout.addAddress")} variant="ghost" onPress={() => setShowForm(true)} />}

      {showForm && (
        <View style={styles.form}>
          <TextField label={t("checkout.addressLabelLabel")} placeholder={t("checkout.addressLabelPlaceholder")} value={label} onChangeText={setLabel} />
          <CitySelectField
            label={t("listingForm.pickupCityLabel")}
            placeholder={t("listingForm.pickupCityLabel")}
            value={city}
            onChange={setCity}
            cancelLabel={t("common.cancel")}
          />
          <TextField label={t("checkout.districtLabel")} value={district} onChangeText={setDistrict} />
          <TextField label={t("checkout.streetLabel")} value={street} onChangeText={setStreet} />
          <Button label={t("checkout.saveAddress")} onPress={handleSave} loading={saving} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, marginBottom: spacing.sm },
  addressRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  addressRowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  addressLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  addressDetail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  form: { gap: spacing.sm, marginTop: spacing.sm },
});
