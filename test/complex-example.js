export default {
  constants: {
    noop: ""
  },
  header: {
    title: "Book Your Flight"
  },
  footer: {
    content: [
      "Please refer to <a href=\"{{- privacyPolicyUrl}}\" data-tracking=\"link-click:privacyPolicy\">Privacy Policy</a> for details on how we handle your personal information.",
      "© SkyWings Airlines Limited ABN 12 345 678 901. Booking services provided by SkyWings Airlines Limited trading as {{airlineName}} Airways."
    ]
  },
  booking: {
    main: {
      title: "Book Your Flight"
    },
    search: {
      heading: "What is a flexible booking?",
      content: [
        "When you choose flexible booking, you can change your flight dates without any fees.",
        "Once you\'ve selected your preferences, we\'ll show you the best available options:"
      ],
      list: [
        "Different departure times throughout the day",
        "Various fare types to suit your needs",
        "Optional extras like seat selection or meals",
        "Alternative dates if you\'re flexible with timing"
      ]
    },
    whatINeedToKnow: {
      heading: "What do I need to know?",
      content: [
        "Here are some important things to consider when booking your flight:"
      ],
      list: [
        "Check your passport is valid for at least 6 months from your travel date",
        "Make sure all passenger names match their travel documents exactly",
        "Consider travel insurance for international flights"
      ]
    },
    online: {
      heading: "Manage your booking online",
      content: [
        "Log in to view your booking details, select seats, add baggage and more.",
        "Forgot your booking reference? Use your email address to retrieve it."
      ],
      button: {
        url: "{{- bookingManageUrl}}",
        label: "Log in"
      }
    },
    contactUs: {
      heading: "Need help with your booking?",
      content: "Call [{{bookingCentreNumber}}](tel:{{bookingCentreNumberTel}}) between Monday to Sunday - 24 hours a day."
    },
    faq: {
      heading: "Common questions",
      content: [
        {
          heading: "What if I need to change my flight?",
          content: "You can change your flight online if:",
          list: [
            "You have a flexible fare type",
            "Your flight is more than 24 hours away",
            "You\'re travelling on the same route"
          ],
          bottomContent: "If you need to make changes, visit <a href=\"{{- bookingChangeUrl}}\" data-tracking=\"link-click:flightChange\">Manage My Booking</a>."
        },
        {
          heading: "How do I add extra baggage?",
          content: "You can add extra baggage up until 3 hours before your flight departs."
        },
        {
          heading: "What meals are available?",
          content: [
            "We offer a range of meals to suit different dietary requirements.",
            "Special meals must be requested at least 24 hours before departure."
          ]
        }
      ]
    }
  }
}
