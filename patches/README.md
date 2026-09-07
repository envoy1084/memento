# Dependency compatibility patches

- Drizzle ORM 1.0.0-rc.4: adapts the removed Effect Schema.TaggedErrorClass runtime name to Schema.TaggedError. The same patch is used by the Namera reference project. Exercise both driver construction and rollback in database tests before removing it.
- Rhinestone SDK 1.8.0: upstream ENS standalone-HCA support, copied unchanged from ensdomains/contracts-v2 `post-audit-2` at `6cd019f567c8eb0ca306c78851d4d58876a8e1df`. This pins SDK transport to the selected source; it does not establish live deployment compatibility.
