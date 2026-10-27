#!/bin/bash
# v0.6.2 serial suite (recreated 23:5x MDT after the box reset wiped /tmp/runser.sh). One test at a time, never parallel.
# v0.8b6: RS_ROOT / RS_PORT / RS_RES let a worktree run its own suite on its own port and results dir (defaults = the main tree, 8811, /tmp/res).
RR=${RS_ROOT:-/workspace/softsound}; RP=${RS_PORT:-8811}; RD=${RS_RES:-/tmp/res}; export RS_PORT=$RP
cd $RR; mkdir -p $RD; [ -z "$RS_T" ] && rm -f $RD/*.txt   # RS_T="a b": run only those (results of the others are kept)
curl -s -o /dev/null localhost:$RP/index.html || (cd www && nohup python3 -m http.server $RP >/tmp/http$RP.log 2>&1 &) ; sleep 1
T="test_world test_abilities test_v2 test_music test_daw harm_check v032_check v04a_check v04b_check v08_check v08p_check v08r_check v08s_view v08p2_check v08q_check v08t_check v08u_check v08v_check v08w_check v08x_check v08y_check v08y2_check v08y3_check v08aura_check v08aurafast_check songsave_check voice_check mouth_check v05a_check v05b_check v05c_check v06_check v061_check v062_check mold_check symbols_check breed_check breakdown_check cues_check delete_check env_check ground_check guide_check items_check mind_check play_check social_check variety_check render_check pw_smoke pw_app pw_inspect pw_tap pw_firsttouch pw_clay pw_save pw_gas v07_check pw_v07 pw_launch v08_save v08_drums_check v08_kit_check v08_glyph pw_glyph pw_dev pw_micfix pw_catch pw_aura pw_songsave pw_voice pw_mouth jamview_check pw_jamview dawbrain_check pw_dawbrain dawpaint_check pw_dawpaint soak_save perf_j"
[ -n "$RS_T" ] && T="$RS_T"
for t in $T; do s=$(date +%s); nf=; [ $t = soak_save ] && nf=--expose-gc; out=$(timeout 900 node $nf tests/$t.js 2>&1); ec=$?; f=$(printf '%s\n' "$out" | grep -c '^ *FAIL'); [ $ec -ne 0 ] && [ $f -eq 0 ] && f="exit$ec"
  { echo "$t | fails=$f | $(printf '%s\n' "$out" | grep -v '^\s*$' | tail -1 | cut -c1-150) | $(( $(date +%s)-s ))s"; printf '%s\n' "$out" | grep '^ *FAIL' | cut -c1-400; } > $RD/$t.txt; cat $RD/$t.txt; done
echo SUITE_DONE
