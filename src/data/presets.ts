import { PresetSample } from '../types';

export const SAMPLE_PRESETS: PresetSample[] = [
  {
    id: 'tech-news',
    name: 'Tech & AI News',
    description: 'Search for AI, Neural Networks, and LLM keywords mapped to Wikipedia articles',
    targets: [
      {
        url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
        keywords: ['neural network', 'algorithm', 'robot', 'ethics']
      },
      {
        url: 'https://en.wikipedia.org/wiki/Machine_learning',
        keywords: ['training', 'model', 'dataset', 'deep learning']
      }
    ],
    urls: [
      'https://en.wikipedia.org/wiki/Artificial_intelligence',
      'https://en.wikipedia.org/wiki/Machine_learning'
    ],
    keywords: ['neural network', 'algorithm', 'training', 'model']
  },
  {
    id: 'web-dev',
    name: 'Web Dev & Frameworks',
    description: 'Compare React and JavaScript core terms across documentation',
    targets: [
      {
        url: 'https://react.dev',
        keywords: ['component', 'hooks', 'state', 'JSX']
      },
      {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        keywords: ['promise', 'async', 'closure', 'prototype']
      }
    ],
    urls: [
      'https://react.dev',
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
    ],
    keywords: ['component', 'hooks', 'async', 'closure']
  },
  {
    id: 'climate-science',
    name: 'Climate & Science',
    description: 'Search environmental keywords on science info pages',
    targets: [
      {
        url: 'https://en.wikipedia.org/wiki/Renewable_energy',
        keywords: ['carbon', 'efficiency', 'grid', 'sustainability']
      },
      {
        url: 'https://en.wikipedia.org/wiki/Solar_power',
        keywords: ['photovoltaic', 'solar', 'battery', 'inverter']
      }
    ],
    urls: [
      'https://en.wikipedia.org/wiki/Renewable_energy',
      'https://en.wikipedia.org/wiki/Solar_power'
    ],
    keywords: ['carbon', 'solar', 'efficiency', 'battery']
  }
];
