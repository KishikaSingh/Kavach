// PLACEHOLDER (Person 1). Person 2 replaces this file; keep the default export.
import React from 'react';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';

export default function ContactsScreen() {
  return (
    <ScreenContainer>
      <EmptyState icon="people-outline" title="Contacts" message="This screen is built by Person 2." />
    </ScreenContainer>
  );
}
