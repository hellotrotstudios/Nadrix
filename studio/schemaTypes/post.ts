import {defineArrayMember, defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

// Topics match the filter buttons on /blogs-events. Adding one here also needs a button in
// src/pages/blogs-events.astro (TOPICS).
export const POST_TOPICS = [
  {title: 'Systems', value: 'systems'},
  {title: 'Industries', value: 'industries'},
  {title: 'Service', value: 'service'},
]

const altField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'Describe the image for screen readers and search engines.',
  validation: (rule) => rule.required(),
})

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      description: 'The web address: nadrixsolutions.com/blog/<slug>. Avoid changing it after publishing.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'topic',
      type: 'string',
      group: 'content',
      options: {list: POST_TOPICS, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published on',
      type: 'datetime',
      group: 'content',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Feature this post',
      type: 'boolean',
      group: 'content',
      description: 'Shown as the large first card on Blogs & events. If several are featured, the newest wins.',
      initialValue: false,
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'One or two sentences shown on the blog card.',
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: 'mainImage',
      title: 'Cover image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [altField],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
            {title: 'Subheading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    validation: (rule) =>
                      rule.uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true}),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [altField, defineField({name: 'caption', type: 'string'})],
        }),
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      group: 'seo',
      description: 'Optional. Defaults to the post title.',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      group: 'seo',
      description: 'Optional. Defaults to the excerpt.',
      validation: (rule) => rule.max(160),
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', topic: 'topic', media: 'mainImage', date: 'publishedAt', featured: 'featured'},
    prepare: ({title, topic, media, date, featured}) => ({
      title,
      media,
      subtitle: [featured ? '★ Featured' : null, topic, date?.slice(0, 10)].filter(Boolean).join(' · '),
    }),
  },
})
