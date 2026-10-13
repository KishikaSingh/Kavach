// PLACEHOLDER (Person 1). Person 2 replaces this file; keep the default export.
// Receives route.params.alertId from the Dashboard and Notifications screens.
import React from 'react';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';

export default function AlertDetailsScreen({ route }) {
  const alertId = route?.params?.alertId;
  return (
    <ScreenContainer edges={['bottom']}>
      <EmptyState
        icon="alert-circle-outline"
        title="Alert Details"
        message={`This screen is built by Person 2.${alertId ? ` (alertId: ${alertId})` : ''}`}
      />
    </ScreenContainer>
  );
}
