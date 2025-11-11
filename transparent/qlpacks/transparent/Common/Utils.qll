import javascript

/**
 * Predicate that checks whether a given expression is not in a blacklisted file
 * 
 * Currently, we're not interested in these:
 * - Test related
 * - Fixtures
 * - Devtools related
 */
predicate isNotInBlacklistedFile(Expr e) {
    // Filter out the following files:
    not e.getFile().getRelativePath().matches("%test%") and
    not e.getFile().getRelativePath().matches("%fixtures%") and
    not e.getFile().getRelativePath().matches("%devtools%") and // eval exists in devtools though...
    not e.getFile().getRelativePath().matches("%benchmark%") and // Vue
    not e.getFile().getRelativePath().matches("%dist%") // Vue
}