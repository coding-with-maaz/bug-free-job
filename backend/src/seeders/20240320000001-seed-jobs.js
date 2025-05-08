'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, get the categories
    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM categories;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {});

    // Function to generate slug
    const generateSlug = (title, company) => {
      const baseSlug = `${title}-${company}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return baseSlug;
    };

    // Function to get current date
    const getCurrentDate = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now.toISOString().slice(0, 19).replace('T', ' ');
    };

    // Function to get date with offset
    const getDateWithOffset = (days) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      date.setHours(0, 0, 0, 0);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const jobs = [
      // Today's Jobs
      {
        id: 73,
        title: 'Senior Full Stack Developer',
        slug: generateSlug('Senior Full Stack Developer', 'TechInnovate Solutions'),
        company: 'TechInnovate Solutions',
        company_logo: 'https://logo.clearbit.com/techinnovate.com',
        location: 'Remote',
        type: 'full-time',
        salary: '$120k - $150k',
        description: 'We are seeking an experienced Full Stack Developer to join our dynamic team. You will be responsible for developing and maintaining both frontend and backend applications, working with modern technologies and best practices.',
        requirements: JSON.stringify([
          '5+ years of experience in full stack development',
          'Strong proficiency in React and Node.js',
          'Experience with TypeScript and modern JavaScript',
          'Knowledge of SQL and NoSQL databases',
          'Experience with cloud platforms (AWS/Azure)',
          'Understanding of microservices architecture',
          'Experience with CI/CD pipelines',
          'Strong problem-solving skills'
        ]),
        tags: JSON.stringify(['Full Stack', 'React', 'Node.js', 'TypeScript', 'AWS', 'Microservices']),
        experience: '5+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Development'],
        created_at: getCurrentDate(),
        updated_at: getCurrentDate(),
        posted_at: getCurrentDate()
      },
      {
        title: 'Frontend Developer (React)',
        slug: generateSlug('Frontend Developer (React)', 'WebTech Solutions'),
        company: 'WebTech Solutions',
        company_logo: 'https://logo.clearbit.com/webtech.com',
        location: 'Remote',
        type: 'full-time',
        salary: '$100k - $130k',
        description: 'Join our team as a Frontend Developer specializing in React. You will be responsible for building modern, responsive web applications.',
        requirements: JSON.stringify([
          '3+ years of experience with React',
          'Strong JavaScript/TypeScript skills',
          'Experience with modern frontend tools',
          'Understanding of responsive design',
          'Experience with state management'
        ]),
        tags: JSON.stringify(['React', 'JavaScript', 'Frontend', 'Web Development']),
        experience: '3+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Development'],
        created_at: getCurrentDate(),
        updated_at: getCurrentDate(),
        posted_at: getCurrentDate()
      },
      {
        title: 'Product Designer',
        slug: generateSlug('Product Designer', 'DesignStudio'),
        company: 'DesignStudio',
        company_logo: 'https://logo.clearbit.com/designstudio.com',
        location: 'Los Angeles, CA',
        type: 'full-time',
        salary: '$95k - $115k',
        description: 'We are looking for a Product Designer to create beautiful and functional user experiences.',
        requirements: JSON.stringify([
          '4+ years of product design experience',
          'Proficiency in Figma and Sketch',
          'Strong portfolio',
          'Experience with user research',
          'Knowledge of design systems'
        ]),
        tags: JSON.stringify(['Product Design', 'UI/UX', 'Figma', 'User Research']),
        experience: '4+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Design'],
        created_at: getCurrentDate(),
        updated_at: getCurrentDate(),
        posted_at: getCurrentDate()
      },
      {
        title: 'Content Marketing Specialist',
        slug: generateSlug('Content Marketing Specialist', 'GrowthMarketing'),
        company: 'GrowthMarketing',
        company_logo: 'https://logo.clearbit.com/growthmarketing.com',
        location: 'Chicago, IL',
        type: 'full-time',
        salary: '$80k - $100k',
        description: 'Join our marketing team as a Content Marketing Specialist. Create engaging content and drive brand awareness.',
        requirements: JSON.stringify([
          '3+ years of content marketing experience',
          'Excellent writing skills',
          'SEO knowledge',
          'Social media expertise',
          'Analytics proficiency'
        ]),
        tags: JSON.stringify(['Content Marketing', 'SEO', 'Social Media', 'Writing']),
        experience: '3+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Marketing'],
        created_at: getCurrentDate(),
        updated_at: getCurrentDate(),
        posted_at: getCurrentDate()
      },
      // Recent Jobs (1-2 days old)
      {
        title: 'Senior React Native Developer',
        slug: generateSlug('Senior React Native Developer', 'TechCorp'),
        company: 'TechCorp',
        company_logo: 'https://logo.clearbit.com/techcorp.com',
        location: 'Remote',
        type: 'full-time',
        salary: '$120k - $150k',
        description: 'We are looking for an experienced React Native developer to join our team. You will be responsible for building and maintaining our mobile applications.',
        requirements: JSON.stringify([
          '5+ years of experience with React Native',
          'Strong JavaScript/TypeScript skills',
          'Experience with state management',
          'Experience with REST APIs',
          'Familiarity with native build tools'
        ]),
        tags: JSON.stringify(['React Native', 'JavaScript', 'Mobile Development']),
        experience: '5+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Development'],
        created_at: getDateWithOffset(1),
        updated_at: getDateWithOffset(1),
        posted_at: getDateWithOffset(1)
      },
      {
        title: 'Backend Developer (Node.js)',
        slug: generateSlug('Backend Developer (Node.js)', 'DataSystems'),
        company: 'DataSystems',
        company_logo: 'https://logo.clearbit.com/datasystems.com',
        location: 'San Francisco, CA',
        type: 'full-time',
        salary: '$110k - $140k',
        description: 'Join our backend team to build scalable and efficient server-side applications.',
        requirements: JSON.stringify([
          '4+ years of Node.js experience',
          'Experience with databases (SQL/NoSQL)',
          'Knowledge of RESTful APIs',
          'Understanding of microservices',
          'Experience with cloud platforms'
        ]),
        tags: JSON.stringify(['Node.js', 'Backend', 'API Development']),
        experience: '4+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Development'],
        created_at: getDateWithOffset(2),
        updated_at: getDateWithOffset(2),
        posted_at: getDateWithOffset(2)
      },
      // Older Jobs (3-7 days old)
      {
        title: 'UI/UX Designer',
        slug: generateSlug('UI/UX Designer', 'DesignHub'),
        company: 'DesignHub',
        company_logo: 'https://logo.clearbit.com/designhub.com',
        location: 'New York, NY',
        type: 'full-time',
        salary: '$90k - $110k',
        description: 'We are looking for a creative UI/UX Designer to join our design team.',
        requirements: JSON.stringify([
          '3+ years of UI/UX design experience',
          'Proficiency in Figma and Adobe XD',
          'Strong portfolio',
          'Experience with design systems',
          'Knowledge of user research'
        ]),
        tags: JSON.stringify(['UI/UX', 'Figma', 'Design Systems']),
        experience: '3+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Design'],
        created_at: getDateWithOffset(3),
        updated_at: getDateWithOffset(3),
        posted_at: getDateWithOffset(3)
      },
      {
        title: 'Digital Marketing Manager',
        slug: generateSlug('Digital Marketing Manager', 'GrowthCo'),
        company: 'GrowthCo',
        company_logo: 'https://logo.clearbit.com/growthco.com',
        location: 'Austin, TX',
        type: 'full-time',
        salary: '$95k - $120k',
        description: 'Lead our digital marketing initiatives and drive business growth.',
        requirements: JSON.stringify([
          '4+ years of digital marketing experience',
          'Experience with SEO and SEM',
          'Strong analytical skills',
          'Experience with marketing automation',
          'Knowledge of analytics tools'
        ]),
        tags: JSON.stringify(['Digital Marketing', 'SEO', 'Analytics']),
        experience: '4+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Marketing'],
        created_at: getDateWithOffset(4),
        updated_at: getDateWithOffset(4),
        posted_at: getDateWithOffset(4)
      },
      {
        title: 'Machine Learning Engineer',
        slug: generateSlug('Machine Learning Engineer', 'AI Solutions'),
        company: 'AI Solutions',
        company_logo: 'https://logo.clearbit.com/aisolutions.com',
        location: 'Remote',
        type: 'full-time',
        salary: '$130k - $160k',
        description: 'Join our AI team to develop and implement machine learning models.',
        requirements: JSON.stringify([
          '3+ years of ML experience',
          'Strong Python skills',
          'Experience with TensorFlow/PyTorch',
          'Knowledge of deep learning',
          'Experience with data preprocessing'
        ]),
        tags: JSON.stringify(['Machine Learning', 'Python', 'Deep Learning']),
        experience: '3+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Data Science'],
        created_at: getDateWithOffset(5),
        updated_at: getDateWithOffset(5),
        posted_at: getDateWithOffset(5)
      },
      {
        title: 'DevOps Engineer',
        slug: generateSlug('DevOps Engineer', 'CloudTech'),
        company: 'CloudTech',
        company_logo: 'https://logo.clearbit.com/cloudtech.com',
        location: 'Seattle, WA',
        type: 'full-time',
        salary: '$120k - $150k',
        description: 'Join our DevOps team to build and maintain our cloud infrastructure.',
        requirements: JSON.stringify([
          '4+ years of DevOps experience',
          'Experience with AWS/Azure',
          'Knowledge of CI/CD pipelines',
          'Experience with containerization',
          'Strong scripting skills'
        ]),
        tags: JSON.stringify(['DevOps', 'AWS', 'CI/CD']),
        experience: '4+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Development'],
        created_at: getDateWithOffset(6),
        updated_at: getDateWithOffset(6),
        posted_at: getDateWithOffset(6)
      },
      {
        title: 'Product Manager',
        slug: generateSlug('Product Manager', 'ProductCo'),
        company: 'ProductCo',
        company_logo: 'https://logo.clearbit.com/productco.com',
        location: 'Boston, MA',
        type: 'full-time',
        salary: '$110k - $140k',
        description: 'Lead product development and drive product strategy.',
        requirements: JSON.stringify([
          '5+ years of product management experience',
          'Strong analytical skills',
          'Experience with agile methodologies',
          'Excellent communication skills',
          'Experience with product analytics'
        ]),
        tags: JSON.stringify(['Product Management', 'Agile', 'Analytics']),
        experience: '5+ years',
        is_active: true,
        is_featured: true,
        quick_apply_enabled: true,
        category_id: categoryMap['Marketing'],
        created_at: getDateWithOffset(7),
        updated_at: getDateWithOffset(7),
        posted_at: getDateWithOffset(7)
      }
    ];

    await queryInterface.bulkInsert('jobs', jobs, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('jobs', null, {});
  }
}; 