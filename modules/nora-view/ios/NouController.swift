import ExpoModulesCore
import WebKit

struct NoraSettings: Record {
  @Field
  var openExternalLinkInSystemBrowser: Bool = false

  @Field
  var redirectToOldReddit: Bool = false

  @Field
  var internalHosts: [String] = []
}

struct NoraBlocklist: Record {
  @Field
  var enabled: Bool = false

  @Field
  var blockedHosts: String = ""

  @Field
  var allowedHosts: String = ""

  @Field
  var revision: Int = 0
}

class NouController {
  static let shared = NouController()

  var settings = NoraSettings()
  var blocklist = NoraBlocklist()
  var i18nStrings: [String: String] = [:]
  var logFn: ((String) -> Void)?
  var blocklistRuleList: WKContentRuleList?
  private let blocklistIdentifier = "nora.runtime.blocklist"
  private let registeredViews = NSHashTable<NoraView>.weakObjects()

  private func decodeHosts(_ value: String) -> [String] {
    return value
      .split(separator: "\n")
      .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
  }

  func log(_ msg: String) {
    logFn?(msg)
  }

  func t(_ key: String) -> String {
    return i18nStrings[key] ?? "Missed translation: \(key)"
  }

  func register(_ view: NoraView) {
    runOnMain {
      self.registeredViews.add(view)
      view.applyBlocklist(self.blocklistRuleList)
    }
  }

  func unregister(_ view: NoraView) {
    runOnMain {
      self.registeredViews.remove(view)
    }
  }

  func setBlocklist(_ next: NoraBlocklist) {
    blocklist = next
    guard next.enabled, !next.blockedHosts.isEmpty else {
      clearBlocklist()
      return
    }

    let encoded = encodeBlocklist(next)
    let targetRevision = next.revision
    runOnMain { [weak self] in
      guard let self = self else { return }
      WKContentRuleListStore.default().compileContentRuleList(
        forIdentifier: self.blocklistIdentifier,
        encodedContentRuleList: encoded
      ) { [weak self] ruleList, error in
        guard let self = self else { return }
        guard self.blocklist.revision == targetRevision, self.blocklist.enabled else {
          return
        }
        if let error = error {
          self.log("blocklist compile failed: \(error.localizedDescription)")
          return
        }
        self.blocklistRuleList = ruleList
        self.applyBlocklist(ruleList)
      }
    }
  }

  private func clearBlocklist() {
    runOnMain {
      self.blocklistRuleList = nil
      self.applyBlocklist(nil)
      WKContentRuleListStore.default().removeContentRuleList(forIdentifier: self.blocklistIdentifier) { _ in }
    }
  }

  private func applyBlocklist(_ ruleList: WKContentRuleList?) {
    runOnMain {
      for view in self.registeredViews.allObjects {
        view.applyBlocklist(ruleList)
      }
    }
  }

  private func runOnMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }

  private func encodeBlocklist(_ blocklist: NoraBlocklist) -> String {
    let resourceTypes = ["image", "style-sheet", "script", "font", "media", "popup", "raw", "svg-document"]
    var rules = [(host: String, allow: Bool)]()
    rules.append(contentsOf: decodeHosts(blocklist.blockedHosts).map { ($0, false) })
    rules.append(contentsOf: decodeHosts(blocklist.allowedHosts).map { ($0, true) })
    rules.sort { lhs, rhs in
      let lhsSpecificity = lhs.host.split(separator: ".").count
      let rhsSpecificity = rhs.host.split(separator: ".").count
      if lhsSpecificity != rhsSpecificity {
        return lhsSpecificity < rhsSpecificity
      }
      if lhs.allow != rhs.allow {
        return rhs.allow
      }
      return lhs.host < rhs.host
    }

    let serializedRules: [[String: Any]] = rules.map { rule in
      let escapedHost = NSRegularExpression.escapedPattern(for: rule.host)
      let pattern = "^[^:]+://([^/]+\\\\.)?\(escapedHost)(?::[0-9]+)?/"
      return [
        "trigger": [
          "url-filter": pattern,
          "resource-type": resourceTypes,
        ],
        "action": [
          "type": rule.allow ? "ignore-previous-rules" : "block",
        ],
      ]
    }

    let data = try? JSONSerialization.data(withJSONObject: serializedRules)
    return String(data: data ?? Data("[]".utf8), encoding: .utf8) ?? "[]"
  }
}
