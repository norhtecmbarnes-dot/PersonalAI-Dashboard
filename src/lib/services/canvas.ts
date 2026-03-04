import { v4 as uuidv4 } from 'uuid';

export interface CanvasComponent {
  id: string;
  type: 'card' | 'table' | 'form' | 'chart' | 'list' | 'metrics' | 'timeline' | 'custom' | 
        'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'footer' | 'navbar' | 
        'diagram' | 'flowchart' | 'architecture' | 'mermaid';
  title?: string;
  description?: string;
  props: Record<string, unknown>;
  children?: CanvasComponent[];
  events?: CanvasEvent[];
  style?: Record<string, string>;
}

export interface CanvasEvent {
  type: 'click' | 'submit' | 'change' | 'hover';
  action: 'api' | 'navigate' | 'emit' | 'copy' | 'download';
  payload?: Record<string, unknown>;
  endpoint?: string;
}

export interface CanvasLayout {
  id: string;
  columns: number;
  rows: number;
  gap: number;
  components: CanvasComponent[];
  responsive: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface CanvasSchema {
  version: string;
  layout: CanvasLayout;
  metadata: {
    created: string;
    updated: string;
    author: string;
    tags: string[];
  };
}

const CANVAS_TEMPLATES: Record<string, CanvasComponent> = {
  // Landing Page Components
  hero: {
    id: '',
    type: 'hero',
    title: 'Hero Section',
    props: {
      headline: 'Transform Your Business',
      subheadline: 'The all-in-one solution for modern teams',
      ctaText: 'Get Started Free',
      ctaLink: '#',
      secondaryCta: 'Watch Demo',
      secondaryLink: '#',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
      align: 'center'
    },
    style: {
      background: 'gradient',
      minHeight: '600px',
      padding: 'xl'
    }
  },
  features: {
    id: '',
    type: 'features',
    title: 'Features',
    props: {
      headline: 'Everything You Need',
      description: 'Powerful features to help you succeed',
      items: [
        { icon: '⚡', title: 'Lightning Fast', description: 'Built for speed and performance' },
        { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security' },
        { icon: '📊', title: 'Analytics', description: 'Real-time insights and reporting' },
        { icon: '🤝', title: 'Collaboration', description: 'Team tools built-in' }
      ],
      columns: 3,
      style: 'cards'
    }
  },
  pricing: {
    id: '',
    type: 'pricing',
    title: 'Pricing',
    props: {
      headline: 'Simple Pricing',
      description: 'Choose the plan that fits your needs',
      tiers: [
        { name: 'Starter', price: '$9', period: '/month', features: ['5 Projects', '10GB Storage', 'Basic Support'], cta: 'Start Free Trial', highlighted: false },
        { name: 'Pro', price: '$29', period: '/month', features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Advanced Analytics'], cta: 'Start Free Trial', highlighted: true },
        { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Everything', 'Dedicated Support', 'Custom Integrations', 'SLA'], cta: 'Contact Sales', highlighted: false }
      ]
    }
  },
  testimonials: {
    id: '',
    type: 'testimonials',
    title: 'Testimonials',
    props: {
      headline: 'Loved by Teams',
      items: [
        { quote: 'This tool transformed our workflow completely.', author: 'Sarah Johnson', role: 'CEO at TechCorp', avatar: '' },
        { quote: 'Best investment we made this year.', author: 'Mike Chen', role: 'CTO at StartupX', avatar: '' }
      ],
      style: 'cards'
    }
  },
  cta: {
    id: '',
    type: 'cta',
    title: 'Call to Action',
    props: {
      headline: 'Ready to Get Started?',
      description: 'Join thousands of teams already using our platform',
      ctaText: 'Start Free Trial',
      ctaLink: '#',
      background: 'gradient'
    }
  },
  navbar: {
    id: '',
    type: 'navbar',
    title: 'Navigation',
    props: {
      logo: 'Brand',
      links: ['Features', 'Pricing', 'About', 'Contact'],
      cta: 'Sign Up'
    }
  },
  footer: {
    id: '',
    type: 'footer',
    title: 'Footer',
    props: {
      columns: [
        { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
        { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
        { title: 'Resources', links: ['Documentation', 'Help Center', 'Community'] }
      ],
      social: ['twitter', 'github', 'linkedin'],
      copyright: '© 2026 All rights reserved.'
    }
  },
  
  // Diagram Components
  mermaid: {
    id: '',
    type: 'mermaid',
    title: 'Diagram',
    props: {
      diagramType: 'flowchart',
      code: 'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Process 1]\n    B -->|No| D[Process 2]\n    C --> E[End]\n    D --> E',
      title: 'Flow Diagram'
    }
  },
  architecture: {
    id: '',
    type: 'architecture',
    title: 'System Architecture',
    props: {
      layers: [
        { name: 'Frontend', components: ['React', 'Next.js', 'Tailwind'] },
        { name: 'API Gateway', components: ['GraphQL', 'REST'] },
        { name: 'Services', components: ['Auth', 'Database', 'Storage'] },
        { name: 'Database', components: ['PostgreSQL', 'Redis'] }
      ],
      connections: [
        { from: 'Frontend', to: 'API Gateway' },
        { from: 'API Gateway', to: 'Services' },
        { from: 'Services', to: 'Database' }
      ]
    }
  },
  
  metricsCard: {
    id: '',
    type: 'card',
    title: 'Metric',
    props: {
      value: '0',
      label: 'Label',
      trend: 'up',
      trendValue: '+0%',
      icon: 'chart'
    },
    style: {
      background: 'gradient',
      padding: 'lg'
    }
  },
  dataTable: {
    id: '',
    type: 'table',
    title: 'Data Table',
    props: {
      columns: [],
      rows: [],
      searchable: true,
      sortable: true,
      pagination: true,
      pageSize: 10
    }
  },
  inputForm: {
    id: '',
    type: 'form',
    title: 'Form',
    props: {
      fields: [],
      submitText: 'Submit',
      resetText: 'Reset'
    },
    events: [
      { type: 'submit', action: 'api', endpoint: '/api/submit' }
    ]
  },
  barChart: {
    id: '',
    type: 'chart',
    title: 'Bar Chart',
    props: {
      chartType: 'bar',
      data: [],
      xAxis: '',
      yAxis: '',
      colors: ['#60a5fa', '#34d399', '#f472b6']
    }
  },
  lineChart: {
    id: '',
    type: 'chart',
    title: 'Line Chart',
    props: {
      chartType: 'line',
      data: [],
      xAxis: '',
      yAxis: '',
      smooth: true
    }
  },
  pieChart: {
    id: '',
    type: 'chart',
    title: 'Pie Chart',
    props: {
      chartType: 'pie',
      data: [],
      showLegend: true,
      showLabels: true
    }
  },
  taskList: {
    id: '',
    type: 'list',
    title: 'Task List',
    props: {
      items: [],
      checkable: true,
      deletable: true,
      showPriority: true
    }
  },
  timeline: {
    id: '',
    type: 'timeline',
    title: 'Timeline',
    props: {
      events: [],
      showDates: true,
      orientation: 'vertical'
    }
  }
};

export function generateComponentHtml(component: CanvasComponent): string {
  switch (component.type) {
    // Landing Page Components
    case 'hero':
      return generateHeroHtml(component);
    case 'features':
      return generateFeaturesHtml(component);
    case 'pricing':
      return generatePricingHtml(component);
    case 'testimonials':
      return generateTestimonialsHtml(component);
    case 'cta':
      return generateCtaHtml(component);
    case 'navbar':
      return generateNavbarHtml(component);
    case 'footer':
      return generateFooterHtml(component);
    
    // Diagram Components
    case 'mermaid':
    case 'diagram':
    case 'flowchart':
      return generateMermaidHtml(component);
    case 'architecture':
      return generateArchitectureHtml(component);
    
    // Dashboard Components
    case 'card':
      return generateCardHtml(component);
    case 'table':
      return generateTableHtml(component);
    case 'form':
      return generateFormHtml(component);
    case 'chart':
      return generateChartHtml(component);
    case 'list':
      return generateListHtml(component);
    case 'timeline':
      return generateTimelineHtml(component);
    case 'metrics':
      return generateMetricsHtml(component);
    case 'custom':
      return component.props.html as string || '';
    default:
      return `<div>Unknown component type: ${component.type}</div>`;
  }
}

function generateCardHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const style = Object.entries(comp.style || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  
  return `
<div class="canvas-card" style="${style}">
  ${comp.title ? `<h3 class="card-title">${comp.title}</h3>` : ''}
  <div class="card-value">${props.value || ''}</div>
  <div class="card-label">${props.label || ''}</div>
  ${props.trend ? `
    <span class="card-trend trend-${props.trend}">
      ${props.trend === 'up' ? '↑' : '↓'} ${props.trendValue || ''}
    </span>
  ` : ''}
</div>`;
}

function generateTableHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const columns = (props.columns as string[]) || [];
  const rows = (props.rows as Record<string, unknown>[]) || [];
  
  return `
<div class="canvas-table">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  ${props.searchable ? `<input type="search" placeholder="Search..." class="table-search" />` : ''}
  <table>
    <thead>
      <tr>
        ${columns.map(col => `<th>${col}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          ${columns.map(col => `<td>${(row as Record<string, string>)[col] || ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${props.pagination ? `
    <div class="table-pagination">
      <button onclick="prevPage()">← Prev</button>
      <span>Page 1</span>
      <button onclick="nextPage()">Next →</button>
    </div>
  ` : ''}
</div>`;
}

function generateFormHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const fields = (props.fields as Array<{ name: string; type: string; label: string; required?: boolean; options?: string[] }>) || [];
  
  return `
<div class="canvas-form">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  <form id="form-${comp.id}" onsubmit="handleFormSubmit(event, '${comp.id}')">
    ${fields.map(field => `
      <div class="form-field">
        <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
        ${field.type === 'select' ? `
          <select name="${field.name}" ${field.required ? 'required' : ''}>
            ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        ` : field.type === 'textarea' ? `
          <textarea name="${field.name}" ${field.required ? 'required' : ''}></textarea>
        ` : `
          <input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''} />
        `}
      </div>
    `).join('')}
    <div class="form-actions">
      <button type="submit">${props.submitText || 'Submit'}</button>
      <button type="reset">${props.resetText || 'Reset'}</button>
    </div>
  </form>
</div>

<script>
function handleFormSubmit(event, formId) {
  event.preventDefault();
  const form = document.getElementById('form-' + formId);
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Emit event for parent to handle
  window.parent.postMessage({
    type: 'CANVAS_EVENT',
    formId: formId,
    action: 'submit',
    data: data
  }, '*');
}
</script>`;
}

function generateChartHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const chartType = props.chartType as string || 'bar';
  const data = props.data || [];
  
  return `
<div class="canvas-chart">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  <canvas id="chart-${comp.id}"></canvas>
</div>

<script>
(function() {
  const ctx = document.getElementById('chart-${comp.id}');
  const chart = new Chart(ctx, {
    type: '${chartType}',
    data: ${JSON.stringify(data)},
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
})();
</script>`;
}

function generateListHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const items = (props.items as Array<{ id: string; text: string; checked?: boolean; priority?: string }>) || [];
  
  return `
<div class="canvas-list">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  <ul class="list-container">
    ${items.map(item => `
      <li class="list-item priority-${item.priority || 'normal'}">
        ${props.checkable ? `<input type="checkbox" ${item.checked ? 'checked' : ''} />` : ''}
        <span>${item.text}</span>
        ${props.deletable ? `<button class="delete-btn" onclick="deleteItem('${item.id}')">×</button>` : ''}
      </li>
    `).join('')}
  </ul>
</div>`;
}

function generateTimelineHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const events = (props.events as Array<{ date: string; title: string; description?: string }>) || [];
  
  return `
<div class="canvas-timeline">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  <div class="timeline-container">
    ${events.map(event => `
      <div class="timeline-event">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          ${props.showDates ? `<span class="timeline-date">${event.date}</span>` : ''}
          <h4>${event.title}</h4>
          ${event.description ? `<p>${event.description}</p>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</div>`;
}

function generateMetricsHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const metrics = (props.metrics as Array<{ label: string; value: string; change?: string; icon?: string }>) || [];
  
  return `
<div class="canvas-metrics">
  ${comp.title ? `<h3>${comp.title}</h3>` : ''}
  <div class="metrics-grid">
    ${metrics.map(m => `
      <div class="metric-card">
        ${m.icon ? `<span class="metric-icon">${m.icon}</span>` : ''}
        <div class="metric-value">${m.value}</div>
        <div class="metric-label">${m.label}</div>
        ${m.change ? `<div class="metric-change">${m.change}</div>` : ''}
      </div>
    `).join('')}
  </div>
</div>`;
}

// Landing Page Component Generators
function generateHeroHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const align = props.align || 'center';
  
  return `
<section class="hero-section" style="text-align: ${align}; padding: 80px 20px;">
  <h1 class="hero-headline">${props.headline || 'Welcome'}</h1>
  <p class="hero-subheadline">${props.subheadline || ''}</p>
  <div class="hero-cta">
    <a href="${props.ctaLink || '#'}" class="btn btn-primary">${props.ctaText || 'Get Started'}</a>
    ${props.secondaryCta ? `<a href="${props.secondaryLink || '#'}" class="btn btn-secondary">${props.secondaryCta}</a>` : ''}
  </div>
  ${props.image ? `<img src="${props.image}" alt="Hero" class="hero-image" />` : ''}
</section>`;
}

function generateFeaturesHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const items = (props.items || []) as Array<{ icon: string; title: string; description: string }>;
  const columns = props.columns || 3;
  
  return `
<section class="features-section" style="padding: 60px 20px;">
  <h2 class="features-headline">${props.headline || 'Features'}</h2>
  <p class="features-description">${props.description || ''}</p>
  <div class="features-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 24px; margin-top: 40px;">
    ${items.map(item => `
      <div class="feature-card">
        <div class="feature-icon">${item.icon}</div>
        <h3 class="feature-title">${item.title}</h3>
        <p class="feature-description">${item.description}</p>
      </div>
    `).join('')}
  </div>
</section>`;
}

function generatePricingHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const tiers = (props.tiers || []) as Array<{ name: string; price: string; period: string; features: string[]; cta: string; highlighted?: boolean }>;
  
  return `
<section class="pricing-section" style="padding: 60px 20px;">
  <h2 class="pricing-headline">${props.headline || 'Pricing'}</h2>
  <p class="pricing-description">${props.description || ''}</p>
  <div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 40px; max-width: 1200px; margin-left: auto; margin-right: auto;">
    ${tiers.map(tier => `
      <div class="pricing-card ${tier.highlighted ? 'pricing-highlighted' : ''}" style="${tier.highlighted ? 'border: 2px solid var(--primary); transform: scale(1.05);' : ''}">
        <h3 class="pricing-tier-name">${tier.name}</h3>
        <div class="pricing-price">${tier.price}<span class="pricing-period">${tier.period}</span></div>
        <ul class="pricing-features">
          ${tier.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <button class="btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'}">${tier.cta}</button>
      </div>
    `).join('')}
  </div>
</section>`;
}

function generateTestimonialsHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const items = (props.items || []) as Array<{ quote: string; author: string; role: string; avatar?: string }>;
  
  return `
<section class="testimonials-section" style="padding: 60px 20px;">
  <h2 class="testimonials-headline">${props.headline || 'Testimonials'}</h2>
  <div class="testimonials-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 40px; max-width: 1000px; margin-left: auto; margin-right: auto;">
    ${items.map(item => `
      <div class="testimonial-card">
        <p class="testimonial-quote">"${item.quote}"</p>
        <div class="testimonial-author">
          ${item.avatar ? `<img src="${item.avatar}" alt="${item.author}" class="testimonial-avatar" />` : ''}
          <div class="testimonial-info">
            <div class="testimonial-name">${item.author}</div>
            <div class="testimonial-role">${item.role}</div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</section>`;
}

function generateCtaHtml(comp: CanvasComponent): string {
  const props = comp.props;
  
  return `
<section class="cta-section" style="padding: 80px 20px; text-align: center; background: ${props.background === 'gradient' ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' : 'var(--bg-card)'}; border-radius: 24px; margin: 40px 20px;">
  <h2 class="cta-headline">${props.headline || 'Get Started'}</h2>
  <p class="cta-description">${props.description || ''}</p>
  <a href="${props.ctaLink || '#'}" class="btn btn-primary btn-large">${props.ctaText || 'Start Now'}</a>
</section>`;
}

function generateNavbarHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const links = (props.links || []) as string[];
  
  return `
<nav class="navbar" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; background: var(--bg-card);">
  <div class="navbar-logo" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${props.logo || 'Brand'}</div>
  <div class="navbar-links" style="display: flex; gap: 24px;">
    ${links.map(link => `<a href="#${link.toLowerCase()}" class="navbar-link">${link}</a>`).join('')}
  </div>
  ${props.cta ? `<button class="btn btn-primary navbar-cta">${props.cta}</button>` : ''}
</nav>`;
}

function generateFooterHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const columns = (props.columns || []) as Array<{ title: string; links: string[] }>;
  const social = (props.social || []) as string[];
  
  return `
<footer class="footer" style="padding: 60px 40px; background: var(--bg-card); margin-top: 40px;">
  <div class="footer-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px; max-width: 1200px; margin: 0 auto;">
    ${columns.map(col => `
      <div class="footer-column">
        <h4 class="footer-title">${col.title}</h4>
        <ul class="footer-links">
          ${col.links.map(link => `<li><a href="#">${link}</a></li>`).join('')}
        </ul>
      </div>
    `).join('')}
  </div>
  ${social.length > 0 ? `
  <div class="footer-social" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155;">
    ${social.map(s => `<a href="#" class="social-link">${s}</a>`).join(' ')}
  </div>
  ` : ''}
  ${props.copyright ? `<div class="footer-copyright" style="text-align: center; margin-top: 20px; color: var(--text-secondary);">${props.copyright}</div>` : ''}
</footer>`;
}

// Diagram Component Generators
function generateMermaidHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const diagramType = (props.diagramType as string) || 'flowchart';
  const code = String(props.code || '');
  
  return `
<div class="mermaid-diagram" style="background: var(--bg-card); padding: 24px; border-radius: 12px;">
  <h3>${comp.title || 'Diagram'}</h3>
  <div class="mermaid-code" style="font-family: monospace; background: #0f172a; padding: 16px; border-radius: 8px; white-space: pre-wrap; overflow-x: auto;">
    ${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </div>
  <div class="mermaid-note" style="margin-top: 12px; color: var(--text-secondary); font-size: 0.875rem;">
    <strong>Note:</strong> To render this diagram, copy the code above and use <a href="https://mermaid.live" target="_blank" style="color: var(--primary);">Mermaid Live Editor</a>
  </div>
</div>`;
}

function generateArchitectureHtml(comp: CanvasComponent): string {
  const props = comp.props;
  const layers = (props.layers || []) as Array<{ name: string; components: string[] }>;
  const connections = (props.connections || []) as Array<{ from: string; to: string }>;
  
  return `
<div class="architecture-diagram" style="background: var(--bg-card); padding: 32px; border-radius: 12px;">
  <h3>${comp.title || 'System Architecture'}</h3>
  <div class="architecture-layers" style="display: flex; flex-direction: column; gap: 32px; margin-top: 24px;">
    ${layers.map(layer => `
      <div class="arch-layer" style="border: 2px solid var(--primary); border-radius: 12px; padding: 16px;">
        <div class="arch-layer-name" style="font-weight: bold; color: var(--primary); margin-bottom: 12px;">${layer.name}</div>
        <div class="arch-components" style="display: flex; flex-wrap: wrap; gap: 12px;">
          ${layer.components.map(comp => `
            <div class="arch-component" style="background: #0f172a; padding: 8px 16px; border-radius: 8px; border: 1px solid #334155;">${comp}</div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
  ${connections.length > 0 ? `
  <div class="architecture-connections" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #334155;">
    <h4>Connections</h4>
    <div class="connections-list" style="display: flex; flex-direction: column; gap: 8px;">
      ${connections.map(conn => `
        <div class="connection" style="display: flex; align-items: center; gap: 8px;">
          <span class="connection-from" style="background: var(--primary); padding: 4px 8px; border-radius: 4px;">${conn.from}</span>
          <span>→</span>
          <span class="connection-to" style="background: var(--success); padding: 4px 8px; border-radius: 4px;">${conn.to}</span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}
</div>`;
}

export function generateLayoutHtml(layout: CanvasLayout): string {
  const { columns, gap, components } = layout;
  
  const gridStyle = `
    display: grid;
    grid-template-columns: repeat(${columns}, 1fr);
    gap: ${gap}px;
  `;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --primary: #60a5fa;
      --success: #34d399;
      --danger: #f87171;
      --warning: #fbbf24;
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      padding: 20px;
      margin: 0;
    }
    .canvas-container { ${gridStyle} }
    .canvas-card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .card-title { color: var(--primary); margin-bottom: 8px; }
    .card-value { font-size: 2rem; font-weight: bold; color: var(--text-primary); }
    .card-label { color: var(--text-secondary); font-size: 0.875rem; }
    .card-trend { font-size: 0.875rem; }
    .trend-up { color: var(--success); }
    .trend-down { color: var(--danger); }
    .canvas-table { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .table-search { 
      width: 100%; 
      padding: 8px 12px; 
      border-radius: 8px; 
      border: 1px solid #334155;
      background: #0f172a;
      color: var(--text-primary);
      margin-bottom: 12px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { color: var(--primary); }
    .canvas-form { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .form-field { margin-bottom: 16px; }
    label { display: block; color: var(--text-secondary); margin-bottom: 4px; }
    input, select, textarea { 
      width: 100%; 
      padding: 8px 12px; 
      border-radius: 8px; 
      border: 1px solid #334155;
      background: #0f172a;
      color: var(--text-primary);
    }
    .form-actions { display: flex; gap: 8px; margin-top: 16px; }
    button { 
      padding: 8px 16px; 
      border-radius: 8px; 
      border: none; 
      cursor: pointer;
      background: var(--primary);
      color: white;
    }
    button:hover { opacity: 0.9; }
    .canvas-chart { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .canvas-list { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .list-container { list-style: none; padding: 0; }
    .list-item { 
      display: flex; 
      align-items: center; 
      padding: 12px; 
      border-radius: 8px;
      margin-bottom: 8px;
      background: #0f172a;
    }
    .priority-high { border-left: 3px solid var(--danger); }
    .priority-medium { border-left: 3px solid var(--warning); }
    .priority-normal { border-left: 3px solid var(--primary); }
    .delete-btn { 
      background: transparent; 
      color: var(--danger); 
      margin-left: auto; 
      padding: 4px 8px;
    }
    .canvas-timeline { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .timeline-container { position: relative; padding-left: 20px; }
    .timeline-event { position: relative; padding-bottom: 20px; }
    .timeline-marker { 
      position: absolute; 
      left: -20px; 
      width: 12px; 
      height: 12px; 
      border-radius: 50%; 
      background: var(--primary);
    }
    .timeline-content { padding-left: 8px; }
    .timeline-date { font-size: 0.75rem; color: var(--text-secondary); }
    .canvas-metrics { background: var(--bg-card); border-radius: 12px; padding: 16px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .metric-card { text-align: center; padding: 16px; background: #0f172a; border-radius: 8px; }
    .metric-value { font-size: 1.5rem; font-weight: bold; color: var(--text-primary); }
    .metric-label { font-size: 0.875rem; color: var(--text-secondary); }
    .metric-change { font-size: 0.75rem; color: var(--success); }
    
    @media (max-width: 768px) {
      .canvas-container { grid-template-columns: 1fr !important; }
    }
  </style>
</head>
<body>
  <div class="canvas-container">
    ${components.map(comp => `<div class="canvas-item">${generateComponentHtml(comp)}</div>`).join('\n')}
  </div>
</body>
</html>`;
}

export class CanvasService {
  createLayout(columns: number = 2, rows: number = 2): CanvasLayout {
    return {
      id: uuidv4(),
      columns,
      rows,
      gap: 16,
      components: [],
      responsive: {
        mobile: 1,
        tablet: 2,
        desktop: columns
      }
    };
  }

  addComponent(layout: CanvasLayout, type: keyof typeof CANVAS_TEMPLATES, overrides: Partial<CanvasComponent> = {}): CanvasLayout {
    const template = CANVAS_TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown component type: ${type}`);
    }
    
    const component: CanvasComponent = {
      ...template,
      id: uuidv4(),
      ...overrides
    };
    
    layout.components.push(component);
    return layout;
  }

  removeComponent(layout: CanvasLayout, componentId: string): CanvasLayout {
    layout.components = layout.components.filter(c => c.id !== componentId);
    return layout;
  }

  updateComponent(layout: CanvasLayout, componentId: string, updates: Partial<CanvasComponent>): CanvasLayout {
    const index = layout.components.findIndex(c => c.id === componentId);
    if (index >= 0) {
      layout.components[index] = { ...layout.components[index], ...updates };
    }
    return layout;
  }

  getTemplateNames(): string[] {
    return Object.keys(CANVAS_TEMPLATES);
  }

  generateFromDescription(description: string): CanvasLayout {
    const layout = this.createLayout(2, 2);
    
    const lowerDesc = description.toLowerCase();
    
    // Sales pipeline / CRM
    if (lowerDesc.includes('sales') || lowerDesc.includes('pipeline') || lowerDesc.includes('crm') || lowerDesc.includes('deal')) {
      this.addComponent(layout, 'metricsCard', {
        title: 'Pipeline Value',
        props: { value: '$245K', label: 'Total Pipeline', trend: 'up', trendValue: '+15%' }
      });
      this.addComponent(layout, 'metricsCard', {
        title: 'Deals',
        props: { value: '47', label: 'Active Deals', trend: 'up', trendValue: '+3' }
      });
      this.addComponent(layout, 'dataTable', {
        title: 'Sales Pipeline',
        props: {
          columns: ['Deal', 'Stage', 'Value', 'Probability'],
          rows: [
            { Deal: 'Acme Corp', Stage: 'Proposal', Value: '$45,000', Probability: '60%' },
            { Deal: 'Beta Inc', Stage: 'Negotiation', Value: '$82,000', Probability: '80%' },
            { Deal: 'Gamma LLC', Stage: 'Qualification', Value: '$28,000', Probability: '30%' },
            { Deal: 'Delta Co', Stage: 'Closed Won', Value: '$120,000', Probability: '100%' }
          ],
          searchable: false
        }
      });
      this.addComponent(layout, 'barChart', {
        title: 'Pipeline by Stage',
        props: {
          chartType: 'bar',
          data: {
            labels: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won'],
            datasets: [{ label: 'Deals', data: [12, 8, 15, 6, 4], backgroundColor: '#60a5fa' }]
          }
        }
      });
      return layout;
    }
    
    // Metrics / Dashboard / KPI
    if (lowerDesc.includes('metric') || lowerDesc.includes('dashboard') || lowerDesc.includes('kpi')) {
      this.addComponent(layout, 'metricsCard', {
        title: 'Total Users',
        props: { value: '1,234', label: 'Active Users', trend: 'up', trendValue: '+12%' }
      });
      this.addComponent(layout, 'metricsCard', {
        title: 'Revenue',
        props: { value: '$45.2K', label: 'Monthly Revenue', trend: 'up', trendValue: '+8%' }
      });
    }
    
    // Chart / Graph
    if (lowerDesc.includes('chart') || lowerDesc.includes('graph')) {
      this.addComponent(layout, 'barChart', {
        title: 'Performance',
        props: {
          chartType: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{ label: 'Views', data: [65, 59, 80, 81, 56] }]
          }
        }
      });
    }
    
    // Table / List / Data
    if (lowerDesc.includes('table') || lowerDesc.includes('list') || lowerDesc.includes('data')) {
      this.addComponent(layout, 'dataTable', {
        title: 'Recent Items',
        props: {
          columns: ['Name', 'Status', 'Date'],
          rows: [
            { Name: 'Item 1', Status: 'Active', Date: '2026-02-28' },
            { Name: 'Item 2', Status: 'Pending', Date: '2026-02-27' }
          ],
          searchable: true
        }
      });
    }
    
    // Form / Input
    if (lowerDesc.includes('form') || lowerDesc.includes('input')) {
      this.addComponent(layout, 'inputForm', {
        title: 'Information',
        props: {
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true },
            { name: 'email', type: 'email', label: 'Email', required: true }
          ]
        }
      });
    }
    
    // Timeline / History
    if (lowerDesc.includes('timeline') || lowerDesc.includes('history')) {
      this.addComponent(layout, 'timeline', {
        title: 'Activity Timeline',
        props: {
          events: [
            { date: '2026-02-28', title: 'Event Created', description: 'New event was added' },
            { date: '2026-02-27', title: 'Status Changed', description: 'Status updated' }
          ]
        }
      });
    }
    
    if (lowerDesc.includes('task') || lowerDesc.includes('todo')) {
      this.addComponent(layout, 'taskList', {
        title: 'Tasks',
        props: {
          items: [
            { id: '1', text: 'Review document', checked: false, priority: 'high' },
            { id: '2', text: 'Send report', checked: true, priority: 'medium' }
          ],
          checkable: true
        }
      });
    }
    
    if (layout.components.length === 0) {
      this.addComponent(layout, 'metricsCard', {
        title: 'Overview',
        props: { value: 'Ready', label: 'Canvas Ready' }
      });
    }
    
    return layout;
  }

  render(layout: CanvasLayout): string {
    return generateLayoutHtml(layout);
  }
}

export const canvasService = new CanvasService();