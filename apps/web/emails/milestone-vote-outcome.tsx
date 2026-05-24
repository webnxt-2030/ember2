import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface MilestoneVoteOutcomeProps {
  name: string
  projectName: string
  milestoneTitle: string
  passed: boolean
  yesPercent: string
  projectUrl: string
}

export const subject = (props: MilestoneVoteOutcomeProps) =>
  `${props.milestoneTitle}: ${props.passed ? 'Passed' : 'Failed'}`

export default function MilestoneVoteOutcome({
  name: _name,
  projectName,
  milestoneTitle,
  passed,
  yesPercent,
  projectUrl,
}: MilestoneVoteOutcomeProps): React.ReactElement {
  const headingColor = passed ? '#386a20' : '#ba1a1a'

  return (
    <EmailLayout preview={`${yesPercent}% of backers approved — milestone ${passed ? 'passed' : 'failed'}.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: headingColor, margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        {milestoneTitle}: {passed ? 'Passed' : 'Failed'}
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        {yesPercent}% of weighted votes approved {milestoneTitle} for {projectName}.
      </Text>
      {passed ? (
        <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
          The Org Owner can now claim the funds for this milestone.
        </Text>
      ) : (
        <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
          The Org Owner may revise and resubmit. You'll be notified when the next vote opens.
        </Text>
      )}
      <Button
        href={projectUrl}
        style={{
          backgroundColor: '#b72301',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          padding: '12px 24px',
          borderRadius: 6,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        View project
      </Button>
    </EmailLayout>
  )
}
