/* AWS Well-Architected Framework Visualizer - vanilla JS, no dependencies */
(function () {
'use strict';

/* ============ helpers ============ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
};

/* ============ data ============ */
const SERVICES = {
  users: { n: 'Users', e: '\u{1F465}', b: 'People using your app from browsers or phones.', t: 'Clients sending HTTPS requests, typically via Route 53 and CloudFront.' },
  elb:   { n: 'ELB', e: '\u2696\uFE0F', b: 'A traffic cop that spreads visitors across healthy servers.', t: 'Elastic Load Balancing (ALB/NLB) distributes traffic across targets in multiple AZs and runs health checks.' },
  ec2a:  { n: 'EC2 (AZ-a)', e: '\u{1F5A5}\uFE0F', b: 'A virtual server running your application.', t: 'Amazon EC2 instance in Availability Zone A, managed by an Auto Scaling group.' },
  ec2b:  { n: 'EC2 (AZ-b)', e: '\u{1F5A5}\uFE0F', b: 'A second server in a different data centre group, so one failure will not stop you.', t: 'Amazon EC2 instance in Availability Zone B, same Auto Scaling group and launch template.' },
  asg:   { n: 'Auto Scaling', e: '\u{1F4C8}', b: 'Adds or removes servers automatically as demand changes.', t: 'EC2 Auto Scaling group with target-tracking policies, health replacement and multi-AZ spread.' },
  rds:   { n: 'RDS', e: '\u{1F5C4}\uFE0F', b: 'A managed database that AWS patches and backs up for you.', t: 'Amazon RDS Multi-AZ with synchronous standby, automated backups, encryption with KMS.' },
  lambda:{ n: 'Lambda', e: '\u03BB', b: 'Runs small bits of code only when needed, no server to manage.', t: 'AWS Lambda: event-driven, pay per request and duration, scales automatically.' },
  s3:    { n: 'S3', e: '\u{1FAA3}', b: 'Nearly unlimited file storage.', t: 'Amazon S3 object storage with versioning, lifecycle policies, storage classes and SSE encryption.' },
  cw:    { n: 'CloudWatch', e: '\u{1F4CA}', b: 'Your dashboard and alarm bell: shows how things are running.', t: 'Amazon CloudWatch metrics, logs, alarms and dashboards; feeds automated responses.' },
  iam:   { n: 'IAM', e: '\u{1F511}', b: 'Decides who is allowed to do what in your AWS account.', t: 'AWS IAM identities, roles and least-privilege policies protecting every API call.' }
};
const EDGES = [['users','elb'],['elb','ec2a'],['elb','ec2b'],['ec2a','rds'],['ec2b','rds'],['ec2b','lambda'],['rds','s3'],['lambda','cw']];
const POS = { users:[60,180], elb:[180,180], ec2a:[330,110], ec2b:[330,250], rds:[500,110], lambda:[500,250], s3:[650,110], cw:[650,250] };

const PILLARS = [
{ id:'ops', name:'Operational Excellence', short:'Operational Excellence', icon:'\u2699\uFE0F', color:'#4f8cff',
  q:'How do we run, monitor and continually improve our workloads?',
  desc:{ b:'Like a well-run restaurant kitchen: clear routines, everyone knows what to do, and every mistake teaches the team something.',
         t:'The ability to support development and run workloads effectively, gain insight into their operation, and continuously improve supporting processes and procedures.' },
  principles:['Perform operations as code','Make frequent, small, reversible changes','Refine operations procedures frequently','Anticipate failure','Learn from all operational failures'],
  areas:['Organization','Prepare','Operate','Evolve'],
  svc:['cw','lambda','asg'],
  services:['AWS CloudFormation / CDK','Amazon CloudWatch','AWS Systems Manager','AWS CloudTrail','AWS Config','AWS X-Ray'],
  example:{ b:'Instead of clicking in the console, the team defines servers in a template and deploys small changes daily. A CloudWatch alarm tells them if something breaks, and they hold a no-blame review after every incident.',
            t:'Infrastructure defined in CloudFormation/CDK, deployed through a CI/CD pipeline with canary releases. CloudWatch alarms trigger Systems Manager runbooks; post-incident reviews feed back into runbooks.' },
  good:'Infrastructure as code, small automated deployments, dashboards and alarms, runbooks, blameless post-incident reviews.',
  poor:'Manual console changes, big quarterly releases, no alarms, nobody knows who fixed what last time.',
  overlay:{ b:'CloudWatch watches everything, Lambda automates responses, and Auto Scaling reacts without a human.', t:'Observability (CloudWatch) plus event-driven automation (Lambda, Auto Scaling) implement "operations as code".' } },
{ id:'sec', name:'Security', short:'Security', icon:'\u{1F512}', color:'#ff5d73',
  q:'How do we protect data, systems and assets?',
  desc:{ b:'Like a building with locked doors, ID badges and cameras: only the right people get in, and you can see who did what.',
         t:'The ability to protect data, systems and assets using cloud technologies to improve security posture, under the shared responsibility model.' },
  principles:['Implement a strong identity foundation (least privilege)','Maintain traceability','Apply security at all layers','Automate security best practices','Protect data in transit and at rest','Keep people away from data','Prepare for security events'],
  areas:['Security foundations','Identity and access management','Detection','Infrastructure protection','Data protection','Incident response','Application security'],
  svc:['iam','elb','s3','rds'],
  services:['AWS IAM / IAM Identity Center','AWS KMS','AWS WAF & Shield','Amazon GuardDuty','AWS CloudTrail','AWS Secrets Manager','Security Groups / VPC'],
  example:{ b:'Each server gets only the permissions it needs, files and databases are encrypted, and every action is logged so you can investigate.',
            t:'EC2 instance roles with least-privilege policies, SSE-KMS on S3, RDS encryption, TLS at the ALB with WAF, private subnets, CloudTrail and GuardDuty for detection.' },
  good:'Least-privilege IAM roles, MFA, encryption at rest and in transit, private subnets, CloudTrail and GuardDuty enabled.',
  poor:'Root account used daily, access keys in code, public S3 buckets, database open to 0.0.0.0/0, no logging.',
  overlay:{ b:'IAM guards every request, the load balancer terminates secure connections, and S3 and RDS hold encrypted data.', t:'IAM roles/policies, TLS at ELB, KMS-encrypted S3 and RDS, security groups for network isolation.' } },
{ id:'rel', name:'Reliability', short:'Reliability', icon:'\u{1F6E1}\uFE0F', color:'#2ec4b6',
  q:'How do we recover from failures and meet demand?',
  desc:{ b:'Like a bridge with spare supports: if one part fails, traffic keeps flowing while it is repaired.',
         t:'The ability of a workload to perform its intended function correctly and consistently, and to recover quickly from failures and meet demand.' },
  principles:['Automatically recover from failure','Test recovery procedures','Scale horizontally to increase aggregate availability','Stop guessing capacity','Manage change through automation'],
  areas:['Foundations','Workload architecture','Change management','Failure management'],
  svc:['elb','asg','ec2a','ec2b','rds'],
  services:['Elastic Load Balancing','EC2 Auto Scaling','Amazon RDS Multi-AZ','Amazon Route 53','AWS Backup','AWS Fault Injection Service'],
  example:{ b:'Servers run in two separate locations. If one dies, the load balancer sends users to the other and Auto Scaling replaces the broken one.',
            t:'Multi-AZ ASG behind an ALB with health checks, RDS Multi-AZ failover, AWS Backup, and tested RTO/RPO via game days.' },
  good:'Multi-AZ deployment, health checks, automated failover, backups with restore tests, defined RTO and RPO.',
  poor:'One server in one AZ, a single database with no backups, recovery never tested.',
  overlay:{ b:'Two servers in different zones, a load balancer, Auto Scaling replacements and a standby database.', t:'Multi-AZ ALB + ASG + RDS standby eliminate single points of failure.' } },
{ id:'perf', name:'Performance Efficiency', short:'Performance Efficiency', icon:'\u26A1', color:'#ffb020',
  q:'How do we use computing resources efficiently as demand and technology change?',
  desc:{ b:'Like choosing the right vehicle for each trip: a bicycle for short hops, a truck for heavy loads, and re-checking as needs change.',
         t:'The ability to use computing resources efficiently to meet system requirements and to maintain that efficiency as demand changes and technologies evolve.' },
  principles:['Democratize advanced technologies','Go global in minutes','Use serverless architectures','Experiment more often','Consider mechanical sympathy'],
  areas:['Selection','Review','Monitoring','Tradeoffs'],
  svc:['ec2a','ec2b','asg','lambda','cw'],
  services:['Amazon EC2 instance families (incl. Graviton)','Amazon CloudFront','Amazon ElastiCache','AWS Lambda','Amazon CloudWatch','AWS Compute Optimizer'],
  example:{ b:'The team picks server sizes that match the work, uses Lambda for short tasks, and checks metrics to see if anything is slow.',
            t:'Right-sized Graviton instances, CloudFront and ElastiCache to cut latency, Lambda for bursty work, and load tests plus Compute Optimizer for ongoing review.' },
  good:'Right-sized resources, caching, load testing, performance dashboards, regular re-evaluation of new instance types.',
  poor:'Same big server for everything, never measured, ignoring new options for years.',
  overlay:{ b:'Pick the right compute for the job, let Auto Scaling match demand, and watch metrics to spot slowness.', t:'Compute selection (EC2 vs Lambda), elastic scaling and CloudWatch metrics drive data-based tuning.' } },
{ id:'cost', name:'Cost Optimization', short:'Cost Optimization', icon:'\u{1F4B0}', color:'#7bd34f',
  q:'How do we avoid unnecessary costs?',
  desc:{ b:'Like turning off lights in empty rooms: pay only for what you use and know where the money goes.',
         t:'The ability to run systems to deliver business value at the lowest price point, through financial management, consumption-based models and measurement.' },
  principles:['Implement cloud financial management','Adopt a consumption model','Measure overall efficiency','Stop spending money on undifferentiated heavy lifting','Analyze and attribute expenditure'],
  areas:['Practice Cloud Financial Management','Expenditure and usage awareness','Cost-effective resources','Manage demand and supply resources','Optimize over time'],
  svc:['asg','lambda','s3'],
  services:['AWS Cost Explorer','AWS Budgets','Savings Plans / Reserved Instances','S3 Lifecycle & Intelligent-Tiering','AWS Cost and Usage Report','Cost allocation tags'],
  example:{ b:'Servers shrink at night, old files move to cheaper storage, and every team can see its own bill.',
            t:'ASG scale-in schedules, Savings Plans for steady load, S3 lifecycle to Glacier, tagging with Cost Explorer showback and Budgets alerts.' },
  good:'Tagging, budgets and alerts, auto scaling, Savings Plans for steady use, storage tiering.',
  poor:'Idle servers running 24/7, no tags, nobody watches the bill, all data in the most expensive storage.',
  overlay:{ b:'Scale down when quiet, pay per use with Lambda, and move old data to cheaper S3 storage.', t:'Elasticity (ASG), pay-per-use (Lambda) and S3 storage classes align spend with demand.' } },
{ id:'sus', name:'Sustainability', short:'Sustainability', icon:'\u{1F331}', color:'#b388ff',
  q:'How do we minimize the environmental impact of running workloads?',
  desc:{ b:'Like using only the energy you need: fewer wasted resources means a smaller footprint on the planet.',
         t:'The ability to continually improve sustainability impacts by reducing energy consumption and increasing efficiency across all components of a workload (added to the framework in 2021).' },
  principles:['Understand your impact','Establish sustainability goals','Maximize utilization','Anticipate and adopt new, more efficient hardware and software','Use managed services','Reduce the downstream impact of your cloud workloads'],
  areas:['Region selection','User behavior patterns','Software and architecture patterns','Data patterns','Hardware patterns','Development and deployment process'],
  svc:['lambda','asg','s3'],
  services:['AWS Customer Carbon Footprint Tool','AWS Graviton','AWS Lambda','EC2 Auto Scaling','S3 Lifecycle policies','Managed services (RDS, Fargate)'],
  example:{ b:'The app runs on efficient processors, scales down when idle and deletes data it no longer needs.',
            t:'Graviton instances, high utilization via ASG, regions with lower carbon intensity, S3 lifecycle expiration and serverless to avoid idle capacity.' },
  good:'High utilization, efficient hardware, data retention rules, managed services, tracking carbon footprint.',
  poor:'Idle over-provisioned servers, hoarding data forever, never measuring impact.',
  overlay:{ b:'Serverless and auto scaling avoid idle machines, and lifecycle rules stop storing data you do not need.', t:'Maximizing utilization with Lambda/ASG and applying S3 lifecycle policies reduces provisioned resources and stored data.' } }
];
const P = {}; PILLARS.forEach(p => { P[p.id] = p; });

const GLOSSARY = [
 ['Availability Zone (AZ)','One or more data centres in a Region with independent power and networking. Using multiple AZs avoids single points of failure.'],
 ['Region','A geographic area containing multiple AZs.'],
 ['Shared responsibility model','AWS secures the cloud itself; you secure what you put in the cloud (data, identities, configuration).'],
 ['Least privilege','Granting only the permissions needed to do a task.'],
 ['IAM role','An identity with permissions that services or users can assume temporarily, without long-term keys.'],
 ['Multi-AZ','Running a resource (such as an RDS database) in more than one AZ for automatic failover.'],
 ['RTO / RPO','Recovery Time Objective: how long you can be down. Recovery Point Objective: how much data loss is acceptable.'],
 ['Horizontal scaling','Adding more small instances rather than making one instance bigger.'],
 ['Infrastructure as code','Defining infrastructure in version-controlled templates (CloudFormation, CDK) instead of manual steps.'],
 ['Auto Scaling','Automatically adjusting the number of instances based on demand or schedules.'],
 ['Right-sizing','Matching resource type and size to the actual workload.'],
 ['Serverless','Services where AWS manages the servers and you pay per use (e.g. Lambda).'],
 ['Well-Architected Tool','Free AWS console service for reviewing workloads against the pillars and tracking improvements.'],
 ['Lens','Extra guidance for specific domains, such as Serverless, SaaS or Machine Learning.'],
 ['HRI','High-risk issue: a finding in a Well-Architected review that could seriously affect the workload.'],
 ['Trade-off','Improving one pillar can cost something in another, for example extra redundancy raises cost.']
];

const SCENARIOS = [
 { t:'The whole app runs on a single EC2 instance in one AZ. Last week the AZ had an outage and the site was down for hours.', a:'rel', hl:['ec2a','rds'], why:'No redundancy across AZs is a classic Reliability issue. Fix: multi-AZ ASG, ELB and RDS Multi-AZ.' },
 { t:'A developer\u2019s IAM access key was committed to a public repository, and the key has administrator permissions.', a:'sec', hl:['iam'], why:'Over-broad credentials and poor secret handling are Security issues. Fix: least-privilege roles, Secrets Manager, rotate keys.' },
 { t:'Production servers sit at 5% CPU all month yet run 24/7 on the largest instance size.', a:'cost', hl:['ec2a','ec2b','asg'], why:'Paying for idle capacity is a Cost Optimization problem (it also hurts Sustainability). Fix: right-size and auto scale.' },
 { t:'Deployments are done by hand in the console. Nobody knows what changed before the latest incident, and there are no runbooks.', a:'ops', hl:['cw','asg'], why:'Manual, untracked change and missing runbooks are Operational Excellence gaps. Fix: infrastructure as code, CI/CD, runbooks.' },
 { t:'Pages take six seconds to load for users overseas, and the team has never load-tested or reviewed instance types.', a:'perf', hl:['ec2a','ec2b','lambda'], why:'Not selecting or reviewing resources against measured needs is Performance Efficiency. Fix: caching/CloudFront, load tests, right compute choice.' },
 { t:'Old log files and test datasets are kept forever in S3 and a large fleet of idle instances is kept \u201Cjust in case\u201D. The company wants to cut its carbon footprint.', a:'sus', hl:['s3','asg'], why:'Reducing wasted resources and unneeded data to lower environmental impact is Sustainability. Fix: lifecycle rules, utilization targets, efficient hardware.' },
 { t:'The RDS database is publicly accessible and its snapshots are unencrypted.', a:'sec', hl:['rds','s3'], why:'Exposed and unencrypted data is a Security issue. Fix: private subnets, security groups and KMS encryption.' },
 { t:'There are no alarms, dashboards or logs. The team learns about outages from customer emails.', a:'ops', hl:['cw'], why:'Operational Excellence includes understanding workload health via observability. Fix: CloudWatch metrics, alarms and logs.' }
];

const CHECK = [
 ['ops','Do you deploy infrastructure and applications through code and pipelines?','Use CloudFormation/CDK and CI/CD.'],
 ['ops','Do you have alarms, dashboards and runbooks for your workload?','CloudWatch alarms plus Systems Manager runbooks.'],
 ['sec','Do all identities and services use least-privilege access (no shared admin keys)?','Use IAM roles and MFA.'],
 ['sec','Is data encrypted in transit and at rest, with logging such as CloudTrail enabled?','KMS, TLS, CloudTrail, GuardDuty.'],
 ['rel','Does your workload run across multiple AZs with automatic failover?','ELB + multi-AZ ASG + RDS Multi-AZ.'],
 ['rel','Have you defined RTO/RPO and tested restores or failover?','Use AWS Backup and game days.'],
 ['perf','Did you choose compute and storage based on measured requirements?','Load test and use Compute Optimizer.'],
 ['perf','Do you regularly review new services or instance types?','Schedule periodic architecture reviews.'],
 ['cost','Are resources tagged, budgeted and monitored for spend?','Cost Explorer, Budgets, tags.'],
 ['cost','Does capacity scale with demand, with commitments for steady usage?','Auto Scaling plus Savings Plans.'],
 ['sus','Do you track and improve utilization and your carbon footprint?','Customer Carbon Footprint Tool, right-sizing.'],
 ['sus','Do you delete or tier data you no longer need?','S3 lifecycle and retention policies.']
];

const QUIZ = [
 { q:'How many pillars does the AWS Well-Architected Framework have?', o:['Four','Five','Six','Seven'], a:2, e:'Six: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization and Sustainability.' },
 { q:'Which pillar focuses on recovering from failures and meeting demand?', o:['Reliability','Performance Efficiency','Cost Optimization','Sustainability'], a:0, e:'Reliability covers fault tolerance, recovery and scaling to demand.' },
 { q:'Running EC2 in two AZs behind an ELB mainly improves which pillar?', o:['Cost Optimization','Reliability','Sustainability','Operational Excellence'], a:1, e:'Multi-AZ removes single points of failure, which is Reliability.' },
 { q:'Giving an application only the permissions it needs is an example of:', o:['Cost allocation','Least privilege (Security)','Right-sizing','Game days'], a:1, e:'Least privilege is a core Security principle implemented with IAM.' },
 { q:'Which practice belongs to Operational Excellence?', o:['Performing operations as code','Encrypting S3 buckets','Using Savings Plans','Choosing a low-carbon Region'], a:0, e:'Operations as code is a design principle of Operational Excellence.' },
 { q:'Moving rarely used data to S3 Glacier primarily supports which pillar(s)?', o:['Only Security','Cost Optimization (and Sustainability)','Only Reliability','Performance Efficiency only'], a:1, e:'It lowers storage spend and reduces the resources you keep active.' },
 { q:'Which pillar was added to the framework in 2021?', o:['Security','Cost Optimization','Sustainability','Reliability'], a:2, e:'Sustainability became the sixth pillar in 2021.' },
 { q:'Using Lambda for spiky workloads and load testing to pick instance types supports:', o:['Performance Efficiency','Security','Operational Excellence only','None of the pillars'], a:0, e:'Selecting the right resource types and reviewing them is Performance Efficiency.' },
 { q:'What is the AWS Well-Architected Tool?', o:['A third-party scanner','A free service to review workloads against the pillars','A billing service','A load balancer'], a:1, e:'It guides reviews, records answers and tracks high-risk issues.' },
 { q:'Who is responsible for securing the data you store in S3?', o:['AWS only','You only','Both, under the shared responsibility model; you control your data and access','Neither'], a:2, e:'AWS secures the infrastructure; you configure access, encryption and data protection.' }
];

const MODULES = [
 { title:'Introduction' }, { pillar:'ops' }, { pillar:'sec' }, { pillar:'rel' }, { pillar:'perf' }, { pillar:'cost' }, { pillar:'sus' },
 { title:'All Six Pillars in Practice' }, { title:'Reviews and Takeaways' }
];
const FULL_TITLES = ['Introduction to AWS Well-Architected Framework','Operational Excellence','Security','Reliability','Performance Efficiency','Cost Optimization','Sustainability','Applying All Six Pillars to a Real-World AWS Architecture','Well-Architected Reviews and Key Takeaways'];

/* ============ state ============ */
const state = {
  step: 0,
  mode: store.get('wa-mode', 'beginner'),
  visited: new Set(JSON.parse(store.get('wa-visited', '[]'))),
  checks: {},
  scen: { i: 0, score: 0, answered: false, done: false },
  quiz: { i: 0, score: 0, answered: false, done: false }
};
const stage = $('#stage');

/* ============ components ============ */
function tx(o) { return state.mode === 'beginner' ? o.b : o.t; }

function archSVG(hl, color, id) {
  const has = hl && hl.length;
  let s = '<svg viewBox="0 0 740 340" role="img" aria-label="AWS reference architecture" ' + (color ? 'style="--pc:' + color + '"' : '') + '>';
  s += '<rect class="zone" x="8" y="48" width="724" height="284" rx="14"/><text class="svlabel" x="20" y="66">VPC (Region)</text>';
  s += '<rect x="8" y="6" width="724" height="30" rx="8" fill="#1d3249" stroke="#4a6a8c"/>';
  s += '<g class="node ' + (has && hl.indexOf('iam') < 0 ? 'dim' : (has ? 'on' : '')) + '" data-id="iam" data-tip="' + SERVICES.iam.n + ': ' + SERVICES.iam.b + '" tabindex="0" role="button" aria-label="IAM"><text x="370" y="27" style="font-size:13px">\u{1F511} IAM \u2013 identity &amp; access across every service</text></g>';
  s += '<rect class="asg" x="262" y="62" width="136" height="262" rx="12"/><g class="node ' + (has && hl.indexOf('asg') < 0 ? 'dim' : (has ? 'on' : '')) + '" data-id="asg" tabindex="0" role="button" aria-label="Auto Scaling" data-tip="Auto Scaling: ' + SERVICES.asg.b + '"><rect x="272" y="288" width="116" height="30" rx="8"/><text x="330" y="308">\u{1F4C8} Auto Scaling</text></g>';
  EDGES.forEach(e => {
    const a = POS[e[0]], b = POS[e[1]];
    const d = has && (hl.indexOf(e[0]) < 0 || hl.indexOf(e[1]) < 0) ? ' dim' : '';
    s += '<line class="edge' + d + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
  });
  Object.keys(POS).forEach(k => {
    const p = POS[k], v = SERVICES[k];
    const cls = has ? (hl.indexOf(k) >= 0 ? 'on' : 'dim') : '';
    s += '<g class="node ' + cls + '" data-id="' + k + '" transform="translate(' + (p[0] - 48) + ',' + (p[1] - 28) + ')" tabindex="0" role="button" aria-label="' + v.n + '" data-tip="' + v.n + ': ' + v.b.replace(/"/g, '') + '">' +
         '<rect width="96" height="56" rx="10"/><text class="em" x="48" y="26">' + v.e + '</text><text x="48" y="46">' + v.n + '</text></g>';
  });
  return s + '</svg>';
}

function bindArch(host) {
  const info = $('.svc-info', host);
  function pick(g) {
    $$('.node', host).forEach(n => n.classList.remove('sel'));
    g.classList.add('sel');
    const v = SERVICES[g.getAttribute('data-id')];
    info.innerHTML = '<div class="card" style="margin:0"><h3>' + v.e + ' ' + v.n + '</h3><p style="margin:0">' + tx(v) + '</p></div>';
  }
  $$('.node', host).forEach(g => {
    g.addEventListener('click', () => pick(g));
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(g); } });
  });
}

function archBlock(hl, color) {
  return '<div class="diagram">' + archSVG(hl, color) + '</div><div class="svc-info tip-s">Select any service to learn what it does.</div>';
}

function pillarPanel(p, host) {
  const tabs = ['Principles', 'Design areas', 'AWS services', 'Example'];
  let cur = 0;
  host.style.setProperty('--pc', p.color);
  function draw() {
    let body = '';
    if (cur === 0) body = '<ul class="list">' + p.principles.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    if (cur === 1) body = '<p class="tip-s">' + (state.mode === 'beginner' ? 'The big topics AWS asks about for this pillar:' : 'Best-practice areas defined for this pillar in the framework:') + '</p><ul class="list">' + p.areas.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    if (cur === 2) body = '<div class="chips">' + p.services.map(x => '<span class="chip">' + x + '</span>').join('') + '</div>';
    if (cur === 3) body = '<p>' + tx(p.example) + '</p>';
    host.innerHTML = '<h2>' + p.icon + ' ' + p.name + '</h2><p>' + tx(p.desc) + '</p><div class="keyq">' + p.q + '</div>' +
      '<div class="tabs" role="tablist" style="margin-top:14px">' + tabs.map((t, i) => '<button role="tab" aria-selected="' + (i === cur) + '" data-i="' + i + '" class="' + (i === cur ? 'on' : '') + '">' + t + '</button>').join('') + '</div><div class="tabbody">' + body + '</div>';
    $$('.tabs button', host).forEach(b => b.addEventListener('click', () => { cur = +b.getAttribute('data-i'); draw(); }));
  }
  draw();
}

function goodPoor(p) {
  return '<div class="gp"><div class="good"><h3>\u2705 Good decision</h3><p style="margin:0">' + p.good + '</p></div><div class="poor"><h3>\u26A0\uFE0F Poor decision</h3><p style="margin:0">' + p.poor + '</p></div></div>';
}

function pager() {
  return '<div class="pager"><button class="btn ghost" id="prev"' + (state.step === 0 ? ' disabled' : '') + '>Previous</button><button class="btn" id="next"' + (state.step === 8 ? ' disabled' : '') + '>Next module</button></div>';
}

/* ============ views ============ */
function viewIntro() {
  stage.innerHTML = '<div class="view"><h1>' + FULL_TITLES[0] + '</h1>' +
   '<p class="lead">' + (state.mode === 'beginner'
     ? 'The Well-Architected Framework is AWS\u2019s checklist of good habits for building cloud systems that are safe, dependable, fast, affordable and kind to the planet. Select a pillar to explore it.'
     : 'The AWS Well-Architected Framework documents architectural best practices across six pillars, expressed as design principles, questions and best practices that you use to measure workloads and identify risks.') + '</p>' +
   '<div class="card"><div class="diagram"><svg id="pillarSvg" viewBox="0 0 520 430" role="group" aria-label="Six pillars diagram"></svg></div><p class="tip-s">Click a pillar in the circle. Use Tab and Enter on the keyboard.</p><div id="pdetail" class="card" style="margin-bottom:0"><p style="margin:0">Choose a pillar above to see its principles, design areas, AWS services and a practical example.</p></div></div>' +
   '<div class="grid2"><div class="card"><h3>Why it matters</h3><p>' + (state.mode === 'beginner' ? 'Fixing design mistakes late is expensive. Asking the right questions early prevents outages, hacks and surprise bills.' : 'Early identification of architectural risk reduces rework, supports informed trade-offs between pillars and provides a consistent language for reviews.') + '</p></div>' +
   '<div class="card"><h3>Good to know</h3><ul class="list"><li>Pillars are different from each other; they are not interchangeable.</li><li>Security and Operational Excellence are usually treated as non-negotiable baselines.</li><li>Other pillars involve trade-offs you decide consciously.</li></ul></div></div>' + pager() + '</div>';
  const svg = $('#pillarSvg'); let h = '';
  const cx = 260, cy = 215, R = 160;
  PILLARS.forEach((p, i) => {
    const ang = (-90 + i * 60) * Math.PI / 180, x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
    h += '<line class="edge" style="animation-duration:2s" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
  });
  h += '<g class="hub"><circle cx="' + cx + '" cy="' + cy + '" r="64" fill="#1d3249" stroke="#ff9900" stroke-width="3"/><text x="' + cx + '" y="' + (cy - 6) + '">Well-</text><text x="' + cx + '" y="' + (cy + 14) + '">Architected</text></g>';
  PILLARS.forEach((p, i) => {
    const ang = (-90 + i * 60) * Math.PI / 180, x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
    const words = p.short.split(' ');
    h += '<g class="pnode" data-id="' + p.id + '" style="--pc:' + p.color + '" tabindex="0" role="button" aria-label="' + p.name + '" data-tip="' + p.name + ': ' + p.q + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="52"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" style="font-size:20px">' + p.icon + '</text>' +
      words.map((w, k) => '<text x="' + x.toFixed(1) + '" y="' + (y + 12 + k * 13).toFixed(1) + '">' + w + '</text>').join('') + '</g>';
  });
  svg.innerHTML = h;
  function sel(g) {
    $$('.pnode', svg).forEach(n => n.classList.remove('sel'));
    g.classList.add('sel');
    pillarPanel(P[g.getAttribute('data-id')], $('#pdetail'));
  }
  $$('.pnode', svg).forEach(g => {
    g.addEventListener('click', () => sel(g));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(g); } });
  });
}

function viewPillar(id) {
  const p = P[id];
  stage.innerHTML = '<div class="view" style="--pc:' + p.color + '"><div class="hero-p"><span class="tag">Pillar ' + (state.step) + ' of 6</span><h1>' + p.icon + ' ' + p.name + '</h1></div>' +
    '<div class="card" id="ppanel"></div>' +
    '<h2>Where this pillar shows up in the architecture</h2><div class="card">' + archBlock(p.svc, p.color) + '<div class="note"><strong>Overlay:</strong> ' + tx(p.overlay) + '</div></div>' +
    '<h2>Good vs poor decisions</h2>' + goodPoor(p) + pager() + '</div>';
  pillarPanel(p, $('#ppanel'));
  bindArch($('.view'));
}

function viewPractice() {
  stage.innerHTML = '<div class="view"><h1>' + FULL_TITLES[7] + '</h1>' +
   '<p class="lead">' + (state.mode === 'beginner' ? 'One real system, seen through six different lenses. Pick a pillar to light up the services that matter most for it.' : 'A three-tier web workload: ALB, Auto Scaling EC2 across two AZs, RDS Multi-AZ, S3, Lambda, CloudWatch and IAM. Each pillar emphasizes different components and trade-offs.') + '</p>' +
   '<div class="card"><div class="chips" id="pchips" role="group" aria-label="Pillar overlay"></div><div id="archHost" style="margin-top:12px"></div><div class="note" id="ovNote">Showing all services.</div></div>' +
   '<div class="card"><h2>Trade-offs between pillars</h2><ul class="list"><li><strong>Reliability vs Cost:</strong> extra AZs and standby databases cost more.</li><li><strong>Security vs Performance:</strong> encryption and inspection add small overhead.</li><li><strong>Cost vs Sustainability:</strong> right-sizing usually helps both.</li><li><strong>Operational Excellence:</strong> automation supports every other pillar.</li></ul></div>' +
   '<h2>Scenario simulator</h2><div class="card" id="sim"></div>' + pager() + '</div>';
  const chips = $('#pchips');
  chips.innerHTML = '<button class="chip on" data-p="all">All</button>' + PILLARS.map(p => '<button class="chip" data-p="' + p.id + '" style="border-color:' + p.color + '">' + p.icon + ' ' + p.name + '</button>').join('');
  function show(pid) {
    $$('button', chips).forEach(b => b.classList.toggle('on', b.getAttribute('data-p') === pid));
    const p = P[pid];
    $('#archHost').innerHTML = archBlock(p ? p.svc : null, p ? p.color : null);
    $('#ovNote').innerHTML = p ? '<strong>' + p.name + ':</strong> ' + tx(p.overlay) : 'Showing all services. Select a pillar above to highlight its key services.';
    bindArch($('#archHost'));
  }
  $$('button', chips).forEach(b => b.addEventListener('click', () => show(b.getAttribute('data-p'))));
  show('all');
  renderSim();
}

function renderSim() {
  const host = $('#sim'), s = state.scen;
  if (s.done) {
    host.innerHTML = '<h3>Simulator complete</h3><div class="score">' + s.score + ' / ' + SCENARIOS.length + '</div><p>' + (s.score >= 6 ? 'Excellent: you can spot which pillar a weakness belongs to.' : 'Good start. Review the pillar modules and try again.') + '</p><button class="btn" id="scenRe">Try again</button>';
    $('#scenRe').addEventListener('click', () => { state.scen = { i: 0, score: 0, answered: false, done: false }; renderSim(); });
    return;
  }
  const sc = SCENARIOS[s.i];
  host.innerHTML = '<p class="tip-s">Scenario ' + (s.i + 1) + ' of ' + SCENARIOS.length + ' \u2022 Score ' + s.score + '</p><div class="diagram" style="margin-bottom:10px">' + archSVG(sc.hl, '#ff6b6b') + '</div>' +
    '<p><strong>' + sc.t + '</strong></p><p>Which pillar should you improve first?</p><div class="pgrid">' + PILLARS.map(p => '<button class="pbtn" data-p="' + p.id + '" style="--pc:' + p.color + '">' + p.icon + ' ' + p.name + '</button>').join('') + '</div><div id="scFb"></div>';
  $$('.pbtn', host).forEach(b => b.addEventListener('click', () => {
    if (s.answered) return; s.answered = true;
    const ok = b.getAttribute('data-p') === sc.a;
    if (ok) s.score++;
    $$('.pbtn', host).forEach(x => { x.disabled = true; if (x.getAttribute('data-p') === sc.a) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#scFb').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'no') + '"><strong>' + (ok ? 'Correct: ' : 'Not quite. Best answer: ') + P[sc.a].name + '.</strong><br>' + sc.why + '</div><button class="btn" id="scNext" style="margin-top:10px">' + (s.i === SCENARIOS.length - 1 ? 'See result' : 'Next scenario') + '</button>';
    $('#scNext').addEventListener('click', () => { s.answered = false; if (s.i === SCENARIOS.length - 1) s.done = true; else s.i++; renderSim(); });
  }));
}

function viewReview() {
  stage.innerHTML = '<div class="view"><h1>' + FULL_TITLES[8] + '</h1>' +
   '<p class="lead">' + (state.mode === 'beginner' ? 'A Well-Architected Review is a friendly health check for your system. You answer questions, find risks and make a plan.' : 'Reviews use the AWS Well-Architected Tool to answer pillar questions, identify high-risk and medium-risk issues, and generate an improvement plan with milestones.') + '</p>' +
   '<ol class="steps"><li>Define the workload</li><li>Answer pillar questions</li><li>Identify high-risk issues</li><li>Plan and fix</li><li>Repeat regularly</li></ol>' +
   '<h2>Review checklist</h2><div class="card" id="check"></div><div class="card" id="results"></div>' +
   '<h2>Key takeaways</h2><div class="card"><ul class="list"><li>Six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.</li><li>The framework guides trade-offs; it is not a pass/fail exam.</li><li>Use the Well-Architected Tool and Lenses for workload-specific reviews.</li><li>Review early, after big changes, and regularly.</li></ul></div>' +
   '<h2>Final assessment</h2><div class="card" id="quiz"></div>' + pager() + '</div>';
  renderCheck(); renderQuiz();
}

function renderCheck() {
  const host = $('#check');
  host.innerHTML = CHECK.map((c, i) => '<div class="q"><span class="tag" style="--pc:' + P[c[0]].color + '">' + P[c[0]].name + '</span><div style="margin-top:6px">' + c[1] + '</div><div class="tip-s">Hint: ' + c[2] + '</div><div class="a" data-i="' + i + '">' +
    ['Yes', 'Partly', 'No'].map((l, k) => '<button data-v="' + (2 - k) + '" class="' + (state.checks[i] === 2 - k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>').join('');
  $$('.a', host).forEach(a => $$('button', a).forEach(b => b.addEventListener('click', () => {
    state.checks[a.getAttribute('data-i')] = +b.getAttribute('data-v');
    $$('button', a).forEach(x => x.classList.toggle('on', x === b));
    updateResults();
  })));
  updateResults();
}
function updateResults() {
  const r = $('#results'); const n = Object.keys(state.checks).length;
  if (!n) { r.innerHTML = '<p style="margin:0">Answer the checklist questions to see your pillar scores.</p>'; return; }
  let total = 0, cnt = 0, worst = null, wv = 101;
  const rows = PILLARS.map(p => {
    let sc = 0, c = 0;
    CHECK.forEach((q, i) => { if (q[0] === p.id && state.checks[i] !== undefined) { sc += state.checks[i]; c++; } });
    const pct = c ? Math.round(sc / (c * 2) * 100) : 0;
    if (c) { total += sc; cnt += c; if (pct < wv) { wv = pct; worst = p; } }
    return '<div class="meter" style="--pc:' + p.color + '"><span>' + p.icon + ' ' + p.short + '</span><div class="b"><i style="width:' + pct + '%"></i></div><span>' + (c ? pct + '%' : '-') + '</span></div>';
  }).join('');
  const overall = Math.round(total / (cnt * 2) * 100);
  r.innerHTML = '<h3>Your results (' + n + ' of ' + CHECK.length + ' answered)</h3><div class="score">' + overall + '%</div>' + rows +
    (worst ? '<div class="note">Focus next on <strong>' + worst.name + '</strong>: ' + worst.good + '</div>' : '');
}

function renderQuiz() {
  const host = $('#quiz'), z = state.quiz;
  if (z.done) {
    const pct = Math.round(z.score / QUIZ.length * 100);
    host.innerHTML = '<h3>Assessment complete</h3><div class="score">' + z.score + ' / ' + QUIZ.length + ' (' + pct + '%)</div><p>' + (pct >= 80 ? 'Outstanding. You understand the six pillars well.' : pct >= 50 ? 'Solid progress. Revisit the pillars you missed.' : 'Keep going. Review each pillar module and try again.') + '</p><button class="btn" id="qRe">Retake quiz</button>';
    $('#qRe').addEventListener('click', () => { state.quiz = { i: 0, score: 0, answered: false, done: false }; renderQuiz(); });
    return;
  }
  const q = QUIZ[z.i];
  host.innerHTML = '<p class="tip-s">Question ' + (z.i + 1) + ' of ' + QUIZ.length + ' \u2022 Score ' + z.score + '</p><h3>' + q.q + '</h3>' + q.o.map((o, i) => '<button class="opt" data-i="' + i + '">' + o + '</button>').join('') + '<div id="qFb"></div>';
  $$('.opt', host).forEach(b => b.addEventListener('click', () => {
    if (z.answered) return; z.answered = true;
    const i = +b.getAttribute('data-i'), ok = i === q.a; if (ok) z.score++;
    $$('.opt', host).forEach((x, k) => { x.disabled = true; if (k === q.a) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#qFb').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'no') + '"><strong>' + (ok ? 'Correct!' : 'Not quite.') + '</strong> ' + q.e + '</div><button class="btn" id="qNext" style="margin-top:10px">' + (z.i === QUIZ.length - 1 ? 'Finish' : 'Next question') + '</button>';
    $('#qNext').addEventListener('click', () => { z.answered = false; if (z.i === QUIZ.length - 1) z.done = true; else z.i++; renderQuiz(); });
  }));
}

/* ============ navigation ============ */
function renderNav() {
  $('#navList').innerHTML = FULL_TITLES.map((t, i) => '<li><button data-i="' + i + '" class="' + (i === state.step ? 'cur ' : '') + (state.visited.has(i) ? 'seen' : '') + '"' + (i === state.step ? ' aria-current="step"' : '') + '><span class="n">' + (state.visited.has(i) && i !== state.step ? '\u2713' : i + 1) + '</span><span>' + t + '</span></button></li>').join('');
  $$('#navList button').forEach(b => b.addEventListener('click', () => go(+b.getAttribute('data-i'))));
  $('#progBar').style.width = (state.visited.size / 9 * 100) + '%';
  $('#progTxt').textContent = state.visited.size + ' of 9 visited';
}
function go(i) {
  state.step = i; state.visited.add(i);
  store.set('wa-visited', JSON.stringify(Array.from(state.visited)));
  const m = MODULES[i];
  if (i === 0) viewIntro(); else if (m.pillar) viewPillar(m.pillar); else if (i === 7) viewPractice(); else viewReview();
  const pv = $('#prev'), nx = $('#next');
  if (pv) pv.addEventListener('click', () => go(state.step - 1));
  if (nx) nx.addEventListener('click', () => go(state.step + 1));
  renderNav();
  $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0); stage.focus({ preventScroll: true });
}

/* ============ mode, glossary, tooltip ============ */
function setMode(m) {
  state.mode = m; store.set('wa-mode', m);
  document.body.className = m;
  $$('.seg button').forEach(b => { const on = b.getAttribute('data-mode') === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  go(state.step);
}
function renderGloss(q) {
  const f = (q || '').toLowerCase();
  const items = GLOSSARY.filter(g => !f || g[0].toLowerCase().indexOf(f) >= 0 || g[1].toLowerCase().indexOf(f) >= 0);
  $('#glossList').innerHTML = items.length ? items.map(g => '<dt>' + g[0] + '</dt><dd>' + g[1] + '</dd>').join('') : '<dd>No matching terms.</dd>';
}
function initUI() {
  $$('.seg button').forEach(b => b.addEventListener('click', () => setMode(b.getAttribute('data-mode'))));
  const dlg = $('#gloss');
  $('#glossBtn').addEventListener('click', () => { renderGloss(''); $('#glossSearch').value = ''; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  $('#glossClose').addEventListener('click', () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
  $('#glossSearch').addEventListener('input', e => renderGloss(e.target.value));
  $('#menuBtn').addEventListener('click', () => { const o = $('#nav').classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', String(o)); });
  const tip = $('#tip');
  function place(e) { tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 270) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; }
  document.addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) { tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; place(e); } });
  document.addEventListener('mousemove', e => { if (!tip.hidden) place(e); });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('[data-tip]')) tip.hidden = true; });
  document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) { const r = t.getBoundingClientRect(); tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; tip.style.left = Math.max(8, r.left) + 'px'; tip.style.top = (r.bottom + 8) + 'px'; } });
  document.addEventListener('focusout', () => { tip.hidden = true; });
}

/* ============ boot ============ */
initUI();
setMode(state.mode === 'technical' ? 'technical' : 'beginner');
})();
