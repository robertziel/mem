import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from mem.seed_export import (
    build_seed_snapshot,
    get_seed_source_dir,
    write_seed_assets,
    write_seed_assets_many,
)


class SeedExportTests(unittest.TestCase):
    def test_build_seed_snapshot_includes_path_parts_and_titles(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            nested = source / "frontend" / "react"
            nested.mkdir(parents=True)
            (nested / "hooks_useeffect.md").write_text("# React Effects\n\nHooks body")
            (source / "plain_note.md").write_text("Plain note title\n\nBody")

            payload, meta = build_seed_snapshot(source_dir=source, server_run_id="run-123")

            self.assertEqual(meta["note_count"], 2)
            self.assertEqual(meta["server_run_id"], "run-123")
            self.assertEqual(payload["notes"][0]["path"], "frontend/react/hooks_useeffect.md")
            self.assertEqual(payload["notes"][0]["title"], "React Effects")
            self.assertEqual(payload["notes"][0]["path_parts"]["top_dir"], "frontend")
            self.assertEqual(payload["notes"][0]["path_parts"]["subdirs"], ["react"])
            self.assertEqual(payload["notes"][0]["path_parts"]["filename_stem"], "hooks_useeffect")
            self.assertEqual(payload["notes"][0]["preview_source"], "# React Effects\n\nHooks body")
            self.assertEqual(payload["notes"][1]["title"], "Plain note title")

    def test_write_seed_assets_writes_payload_and_meta_files(self):
        with tempfile.TemporaryDirectory() as src_tmp, tempfile.TemporaryDirectory() as out_tmp:
            source = Path(src_tmp)
            output = Path(out_tmp)
            (source / "ops").mkdir()
            (source / "ops" / "docker_healthcheck.md").write_text("# Docker Healthcheck\n\nChecks")

            meta = write_seed_assets(output, source_dir=source, server_run_id="server-abc")

            self.assertEqual(meta["server_run_id"], "server-abc")
            self.assertTrue((output / "seed.json").exists())
            self.assertTrue((output / "seed.meta.json").exists())

            payload = json.loads((output / "seed.json").read_text())
            written_meta = json.loads((output / "seed.meta.json").read_text())

            self.assertEqual(payload["notes"][0]["path"], "ops/docker_healthcheck.md")
            self.assertEqual(written_meta["note_count"], 1)
            self.assertEqual(written_meta["server_run_id"], "server-abc")

    def test_write_seed_assets_many_reuses_one_run_id_for_all_outputs(self):
        with (
            tempfile.TemporaryDirectory() as src_tmp,
            tempfile.TemporaryDirectory() as out_a_tmp,
            tempfile.TemporaryDirectory() as out_b_tmp,
        ):
            source = Path(src_tmp)
            output_a = Path(out_a_tmp)
            output_b = Path(out_b_tmp)
            (source / "frontend").mkdir()
            (source / "frontend" / "react_native_local_cache.md").write_text("# Local Cache\n\nBody")

            meta = write_seed_assets_many([output_a, output_b], source_dir=source)

            meta_a = json.loads((output_a / "seed.meta.json").read_text())
            meta_b = json.loads((output_b / "seed.meta.json").read_text())

            self.assertEqual(meta["server_run_id"], meta_a["server_run_id"])
            self.assertEqual(meta["server_run_id"], meta_b["server_run_id"])
            self.assertEqual(meta_a["note_count"], 1)
            self.assertEqual(meta_b["note_count"], 1)

    def test_default_seed_source_prefers_repo_data_over_mem_home(self):
        with tempfile.TemporaryDirectory() as repo_tmp, tempfile.TemporaryDirectory() as mem_home_tmp:
            repo_root = Path(repo_tmp)
            repo_data = repo_root / "data"
            repo_data.mkdir()
            (repo_data / "repo_note.md").write_text("# Repo Note\n\nFrom repo data")

            mem_home = Path(mem_home_tmp)
            (mem_home / "mem_home_note.md").write_text("# Mem Home Note\n\nFrom mem home")

            with patch("mem.seed_export.repo_root", repo_root):
                source = get_seed_source_dir()
                payload, meta = build_seed_snapshot(server_run_id="repo-run")

            self.assertEqual(source, repo_data.resolve())
            self.assertEqual(meta["source_dir"], repo_data.resolve().as_posix())
            self.assertEqual(payload["notes"][0]["path"], "repo_note.md")


if __name__ == "__main__":
    unittest.main()
