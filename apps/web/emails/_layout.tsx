import { Container, Section, Text, Html, Head, Body, Preview } from '@react-email/components'
import React from 'react'

export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f9f6f3', fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', backgroundColor: '#ffffff', padding: 40, borderRadius: 8 }}>
          {/* Wordmark */}
          <Text style={{ fontSize: 20, fontWeight: 700, color: '#b72301', margin: '0 0 32px 0', letterSpacing: '-0.01em' }}>
            Ember
          </Text>
          {children}
          {/* Footer */}
          <Section style={{ marginTop: 40, borderTop: '1px solid #e8e3e1', paddingTop: 16 }}>
            <Text style={{ fontSize: 12, color: '#4f4543', margin: 0 }}>
              Ember. Secured by Morph L2.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
