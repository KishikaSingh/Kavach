// PLACEHOLDER (Person 1). Person 2 replaces this file; keep the default export.
import React from 'react';
import ScreenContainer from '../components/ScreenContainer';
import EmptyState from '../components/EmptyState';

export default function ContactFormScreen() {
  return (
    <ScreenContainer edges={['bottom']}>
      <EmptyState icon="person-add-outline" title="Contact Form" message="This screen is built by Person 2." />
    </ScreenContainer>
  );
}
