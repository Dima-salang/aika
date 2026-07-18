"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/components/providers/auth-provider";
import { RichTextEditor } from "@/components/ui-components/rich-text-editor";
import { renderMarkdown } from "@/utils/markdown";
import { MessageSquare, Reply, Edit2, Trash2, Send, CornerDownRight, MoreVertical, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

interface LogCommentsProps {
  logId: string;
  onCommentCountChange?: (count: number) => void;
}

interface CommentNode {
  comment: any;
  replies: CommentNode[];
}

export function LogComments({ logId, onCommentCountChange }: LogCommentsProps) {
  const { session } = useAuth();
  const userId = session?.user?.id || "";
  const utils = trpc.useUtils();
  const { showConfirm } = useConfirmStore();

  // States
  const [newCommentText, setNewCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

  // Queries & Mutations
  const { data: comments, isLoading, refetch } = trpc.listComments.useQuery({
    filter: { log_id: logId },
    limit: 100, // retrieve all for hierarchical threading
  });

  // Propagate total count to parent when comments query updates
  useEffect(() => {
    if (comments) {
      onCommentCountChange?.(comments.length);
    }
  }, [comments, onCommentCountChange]);

  const createCommentMutation = trpc.createComment.useMutation({
    onSuccess: () => {
      utils.listComments.invalidate({ filter: { log_id: logId } });
      setNewCommentText("");
      setReplyToId(null);
      setReplyText("");
      toast.success("Comment posted!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to post comment");
    },
  });

  const updateCommentMutation = trpc.updateComment.useMutation({
    onSuccess: () => {
      utils.listComments.invalidate({ filter: { log_id: logId } });
      setEditingId(null);
      setEditText("");
      toast.success("Comment updated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update comment");
    },
  });

  const deleteCommentMutation = trpc.deleteComment.useMutation({
    onSuccess: () => {
      utils.listComments.invalidate({ filter: { log_id: logId } });
      toast.success("Comment deleted!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete comment");
    },
  });

  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;
    createCommentMutation.mutate({
      log_id: logId,
      user_id: userId,
      comment: newCommentText,
    });
  };

  const handleCreateReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    createCommentMutation.mutate({
      log_id: logId,
      user_id: userId,
      parent_id: parentId,
      comment: replyText,
    });
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    updateCommentMutation.mutate({
      id: commentId,
      comment: editText,
    });
  };

  const handleDeleteComment = (commentId: string) => {
    showConfirm({
      title: "Delete comment?",
      description: "Are you sure you want to delete this comment? This action cannot be undone.",
      onConfirm: async () => {
        deleteCommentMutation.mutate({ id: commentId });
      },
    });
  };

  // Build hierarchical comment tree
  const buildTree = (flatComments: any[]): CommentNode[] => {
    const map = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];

    // Initialize map
    flatComments.forEach((c) => {
      map.set(c.id, { comment: c, replies: [] });
    });

    // Populate hierarchy
    flatComments.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort replies chronologically (older first)
    const sortNode = (node: CommentNode) => {
      node.replies.sort(
        (a, b) => new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime()
      );
      node.replies.forEach(sortNode);
    };

    roots.sort((a, b) => new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime());
    roots.forEach(sortNode);

    return roots;
  };

  const commentTree = comments ? buildTree(comments) : [];

  // Render a single comment item (and recurse for replies)
  const renderCommentNode = (node: CommentNode, depth = 0) => {
    const { comment, replies } = node;
    const isAuthor = comment.user_id === userId;
    const formattedDate = new Date(comment.created_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isReplying = replyToId === comment.id;
    const isEditing = editingId === comment.id;

    return (
      <motion.div 
        key={comment.id} 
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="space-y-3"
      >
        <div 
          className={`flex gap-3 p-3 bg-surface-container-low/30 border border-outline-variant/30 rounded-xl transition-colors duration-200 hover:border-primary/30 relative ${
            isAuthor ? "border-primary/20 bg-primary/[3%]" : ""
          }`}
        >
          {/* User avatar */}
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-outline-variant text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 select-none">
            {comment.user_image ? (
              <img src={comment.user_image} alt={comment.user_name} className="h-full w-full rounded-full object-cover" />
            ) : (
              comment.user_name.slice(0, 2)
            )}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            {/* Header info */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-on-surface truncate">{comment.user_name}</span>
                {isAuthor && (
                  <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1 rounded font-bold">
                    You
                  </span>
                )}
                <span className="text-[9.5px] text-outline font-mono-timer">{formattedDate}</span>
              </div>

              {/* Action options */}
              <div className="relative">
                <button
                  onClick={() => setShowOptionsId(showOptionsId === comment.id ? null : comment.id)}
                  className="p-1 rounded-full hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>

                <AnimatePresence>
                  {showOptionsId === comment.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-1 w-24 bg-surface dark:bg-[#18181b] border border-outline-variant rounded-lg shadow-xl py-1 z-10 select-none"
                    >
                      <button
                        onClick={() => {
                          if (depth >= 2) {
                            toast.error("Nesting reply depth is limited to 3 levels.");
                            setShowOptionsId(null);
                            return;
                          }
                          setReplyToId(comment.id);
                          setReplyText("");
                          setEditingId(null);
                          setShowOptionsId(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-container-high flex items-center gap-1.5 font-medium transition-colors ${
                          depth >= 2 ? "text-outline/50 cursor-not-allowed" : "text-on-surface"
                        }`}
                      >
                        <Reply className="h-3 w-3 text-outline" /> Reply
                      </button>
                      {isAuthor && (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditText(comment.comment);
                              setReplyToId(null);
                              setShowOptionsId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 font-medium transition-colors"
                          >
                            <Edit2 className="h-3 w-3 text-outline" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteComment(comment.id);
                              setShowOptionsId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-error hover:bg-error/10 flex items-center gap-1.5 font-bold transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-error" /> Delete
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Comment Body */}
            {isEditing ? (
              <div className="space-y-2 mt-1">
                <div className="border border-outline-variant rounded-lg p-2 bg-surface-container-lowest focus-within:border-primary/50 transition-all">
                  <RichTextEditor
                    value={editText}
                    onChange={setEditText}
                    placeholder="Edit your comment..."
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-[10px] font-bold border border-outline-variant hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateComment(comment.id)}
                    disabled={updateCommentMutation.isPending || !editText.trim()}
                    className="px-2 py-1 text-[10px] font-bold bg-primary text-on-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {updateCommentMutation.isPending ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-on-surface leading-relaxed pr-2 prose prose-invert max-w-none">
                {renderMarkdown(comment.comment)}
              </div>
            )}
          </div>
        </div>

        {/* Reply input */}
        <AnimatePresence>
          {isReplying && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2.5 items-start pl-8 overflow-hidden"
            >
              <CornerDownRight className="h-4 w-4 text-outline mt-2 shrink-0" />
              <div className="flex-1 space-y-2 bg-surface-container/30 border border-outline-variant/40 p-3 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Replying to {comment.user_name}</span>
                  <button 
                    onClick={() => setReplyToId(null)}
                    className="p-0.5 rounded-full hover:bg-surface-container-high text-outline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="border border-outline-variant rounded-lg p-2 bg-surface-container-lowest focus-within:border-primary/50 transition-all">
                  <RichTextEditor
                    value={replyText}
                    onChange={setReplyText}
                    placeholder="Write a reply..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleCreateReply(comment.id)}
                    disabled={createCommentMutation.isPending || !replyText.trim()}
                    className="px-2.5 py-1 text-[10px] font-bold bg-primary text-on-primary hover:bg-primary-hover rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {createCommentMutation.isPending ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-2.5 w-2.5" /> Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested replies recursive render */}
        {replies.length > 0 && (
          <div className="pl-6 border-l-2 border-zinc-300 dark:border-zinc-700/80 space-y-3 mt-2">
            {replies.map((replyNode) => renderCommentNode(replyNode, depth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h4 className="text-[10px] text-outline font-extrabold uppercase tracking-wider flex items-center gap-1.5 select-none border-b border-outline-variant/30 pb-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" /> Comments ({comments?.length || 0})
      </h4>

      {/* Main comments feed */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !comments || comments.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container-lowest/30 select-none">
          <p className="text-xs text-outline font-semibold">No comments yet</p>
          <p className="text-[10px] text-outline/80 mt-0.5">Be the first to start the discussion!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1.5 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {commentTree.map((node) => renderCommentNode(node))}
          </AnimatePresence>
        </div>
      )}

      {/* Comment Form */}
      <div className="space-y-2 pt-2 border-t border-outline-variant/35">
        <div className="border border-outline-variant rounded-lg p-2.5 bg-surface-container-lowest focus-within:border-primary/50 transition-all">
          <RichTextEditor
            value={newCommentText}
            onChange={setNewCommentText}
            placeholder="Add to the conversation..."
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleCreateComment}
            disabled={createCommentMutation.isPending || !newCommentText.trim()}
            className="px-3 py-1.5 text-[11px] font-bold bg-primary text-on-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Send className="h-3 w-3" /> Post Comment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
