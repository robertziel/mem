import unittest

from mem.utils import classify_search_match, normalize_search_terms


class SearchRankingTests(unittest.TestCase):
    def test_prefers_top_directory_then_subdirectory_then_filename(self):
        terms = normalize_search_terms("rails authentication jwt")

        top_subdir_filename = classify_search_match(
            "rails/authentication/api_jwt_stateless_tokens.md",
            "",
            terms,
        )
        subdir_and_filename = classify_search_match(
            "backend/authentication/rails_jwt_stateless_tokens.md",
            "",
            terms,
        )
        filename_only = classify_search_match(
            "backend/guides/rails_authentication_jwt.md",
            "",
            terms,
        )

        self.assertIsNotNone(top_subdir_filename)
        self.assertIsNotNone(subdir_and_filename)
        self.assertIsNotNone(filename_only)
        self.assertGreater(top_subdir_filename["sort_key"], subdir_and_filename["sort_key"])
        self.assertGreater(subdir_and_filename["sort_key"], filename_only["sort_key"])

    def test_content_is_fallback_after_path_keywords(self):
        terms = normalize_search_terms("rails jwt")

        filename_match = classify_search_match(
            "backend/guides/rails_jwt_basics.md",
            "",
            terms,
        )
        content_match = classify_search_match(
            "backend/guides/token_basics.md",
            "Rails apps often use JWT for stateless auth.",
            terms,
        )

        self.assertIsNotNone(filename_match)
        self.assertIsNotNone(content_match)
        self.assertGreater(filename_match["sort_key"], content_match["sort_key"])
        self.assertEqual(content_match["line_num"], 0)


if __name__ == "__main__":
    unittest.main()
