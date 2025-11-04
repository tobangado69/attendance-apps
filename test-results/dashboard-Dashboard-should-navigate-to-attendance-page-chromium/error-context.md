# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Sign in to your account" [level=2] [ref=e5]
      - paragraph [ref=e6]: Employee Dashboard
    - generic [ref=e7]:
      - generic [ref=e9]: Sign In
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]:
            - generic [ref=e13]: Email address
            - textbox "Email address" [ref=e14]: admin@company.com
          - generic [ref=e15]:
            - generic [ref=e16]: Password
            - textbox "Password" [ref=e17]: admin123
          - button "Sign in" [ref=e18]
        - generic [ref=e19]:
          - paragraph [ref=e20]: "Demo credentials:"
          - paragraph [ref=e21]: "Admin: admin@company.com / admin123"
          - paragraph [ref=e22]: "Manager: manager@company.com / manager123"
          - paragraph [ref=e23]: "Employee: employee@company.com / employee123"
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```