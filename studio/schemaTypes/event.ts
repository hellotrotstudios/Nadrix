import {defineField, defineType} from 'sanity'
import {CalendarIcon} from '@sanity/icons/Calendar'

// Events appear on /blogs-events. The soonest upcoming event (end date today or later) is shown
// as "Next event"; events whose end date has passed move to "Past events" automatically.
export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'tagline',
      type: 'string',
      description: 'Short line under the name, e.g. "Lubrication engineered for railways."',
    }),
    defineField({name: 'startDate', title: 'Start date', type: 'date', validation: (rule) => rule.required()}),
    defineField({
      name: 'endDate',
      title: 'End date',
      type: 'date',
      description: 'Leave empty for a one-day event.',
      validation: (rule) =>
        rule.custom((end, ctx) => {
          const start = (ctx.document as {startDate?: string} | undefined)?.startDate
          return !end || !start || end >= start ? true : 'End date must be on or after the start date'
        }),
    }),
    defineField({
      name: 'venue',
      type: 'string',
      description: 'e.g. "RDSO Stadium Ground, Lucknow, India"',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'stall', title: 'Stall / booth', type: 'string', description: 'e.g. "201" or "H2-A108"'}),
    defineField({
      name: 'image',
      type: 'image',
      description: 'Shown when this is the next event.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'meetingEmail',
      title: 'Meeting requests go to',
      type: 'string',
      description: '"Plan a meeting" opens an email to this address.',
      initialValue: 'sales@nadrixsolutions.com',
      validation: (rule) => rule.email(),
    }),
  ],
  orderings: [{title: 'Date, newest first', name: 'startDesc', by: [{field: 'startDate', direction: 'desc'}]}],
  preview: {
    select: {title: 'name', start: 'startDate', venue: 'venue', media: 'image'},
    prepare: ({title, start, venue, media}) => ({title, media, subtitle: [start, venue].filter(Boolean).join(' · ')}),
  },
})
