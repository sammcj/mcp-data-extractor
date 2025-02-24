export default {
  constants: {
    brandName: 'PawCare',
    brandPortalUrl: '',
    faqUrl: 'http://help.pawcare.com/faq',
    privacyPolicyUrl: 'https://www.pawcare.com/privacy',
    supportNumber: '1800 PAW CARE',
    supportNumberTel: '1800729227'
  },
  home: {
    question: {
      content: [
        'If you have questions about your pet\'s treatment plan or need to reschedule an appointment, please contact your veterinary clinic directly.',
        'For policy-related questions, contact us on [{{supportNumber}}](tel:{{supportNumberTel}}) between Monday to Saturday - 9:00am to 6:00pm.'
      ]
    }
  },
  stages: {
    bookVet: {
      aboutContent: 'Your claim has been reviewed and you can now schedule a veterinary appointment. Call [{{supportNumber}}](tel:{{supportNumberTel}}) to find a partner clinic near you. Our network veterinarians provide comprehensive care for your pet.',
      userProactiveContent: [
        'If you need transportation services for your pet, our partner clinics can arrange this for you, or you can contact us to discuss alternatives.',
        'For any questions about your coverage, please call us on [{{supportNumber}}](tel:{{supportNumberTel}}) between Monday to Saturday - 9:00am to 6:00pm.'
      ]
    }
  },
  faq: {
    examination: {
      microchip: {
        content: [
          'If your policy includes our premium coverage, we\'ll cover the cost of microchipping your pet during their annual health check.',
          'Even if your pet already has a microchip, we recommend having it scanned annually to ensure it\'s working correctly.',
          'Contact us to learn more about microchipping coverage and benefits.'
        ]
      }
    }
  },
  comprehensiveFAQ: {
    claims: {
      emergencyVet: {
        content: [
          'Coverage for emergency vet visits depends on your policy level.',
          'After-hours emergency care is fully covered under our premium plans, with standard excess applying.'
        ]
      }
    },
    coverage: {
      annualVsLifetime: {
        content: [
          'Annual coverage resets each year when you renew your policy, with new benefit limits.',
          'Lifetime coverage provides continuous protection for ongoing conditions throughout your pet\'s life.',
          'Check your Pet Insurance Certificate to see which type of coverage you have.'
        ]
      }
    }
  }
};
